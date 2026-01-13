/**
 * Stats Lambda Function
 * Fetches store statistics (Products, Orders, Customers) from Shopify Admin API
 * Handles rate limiting with retry logic
 * Implements caching via DynamoDB to reduce API calls
 * Supports multiple app registrations via dynamic credential loading
 *
 * AUTHENTICATION: Requires valid Shopify session token in Authorization header
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { requireSessionToken, getShopFromToken, getAppFromToken } = require('./verifySessionToken');
const { getShopAccessToken } = require('./credentials');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const API_VERSION = '2024-01';
const CACHE_TABLE = process.env.STATS_CACHE_TABLE || 'shopify-stats-cache';
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10); // Default 1 hour

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make API call to Shopify with retry logic for rate limiting
 */
async function callShopifyApi(shop, accessToken, endpoint, maxRetries = 3) {
  const url = `https://${shop}/admin/api/${API_VERSION}/${endpoint}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    // Handle rate limiting (429)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '2';
      const waitTime = parseInt(retryAfter, 10) * 1000;

      console.log(`Rate limited. Attempt ${attempt}/${maxRetries}. Waiting ${waitTime}ms`);

      if (attempt < maxRetries) {
        await sleep(waitTime);
        continue;
      }

      throw new Error('Rate limited: Too many requests to Shopify API');
    }

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

/**
 * Fetch product count
 */
async function getProductCount(shop, accessToken) {
  const data = await callShopifyApi(shop, accessToken, 'products/count.json');
  return data.count;
}

/**
 * Fetch order count
 */
async function getOrderCount(shop, accessToken) {
  const data = await callShopifyApi(shop, accessToken, 'orders/count.json?status=any');
  return data.count;
}

/**
 * Fetch customer count
 */
async function getCustomerCount(shop, accessToken) {
  const data = await callShopifyApi(shop, accessToken, 'customers/count.json');
  return data.count;
}

/**
 * Fetch collection count (custom + smart collections)
 */
async function getCollectionCount(shop, accessToken) {
  const [customData, smartData] = await Promise.all([
    callShopifyApi(shop, accessToken, 'custom_collections/count.json'),
    callShopifyApi(shop, accessToken, 'smart_collections/count.json'),
  ]);
  return (customData.count || 0) + (smartData.count || 0);
}

/**
 * Fetch variant count using GraphQL
 */
async function getVariantCount(shop, accessToken) {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;

  const query = `
    query {
      productVariantsCount {
        count
      }
    }
  `;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL error: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL error: ${data.errors[0]?.message}`);
  }

  return data.data?.productVariantsCount?.count || 0;
}


/**
 * Get cached stats from DynamoDB
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain
 * @returns {Object|null} Cached stats if valid, null if expired or not found
 */
async function getCachedStats(appId, shop) {
  try {
    // Use composite key: {appId}:{shop}
    const cacheKey = `${appId}:${shop}`;
    const response = await docClient.send(new GetCommand({
      TableName: CACHE_TABLE,
      Key: { shop: cacheKey },
    }));

    if (!response.Item) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    // Check if cache is still valid (ttl not expired)
    if (response.Item.ttl && response.Item.ttl > now) {
      return {
        products: response.Item.products,
        orders: response.Item.orders,
        customers: response.Item.customers,
        variants: response.Item.variants,
        collections: response.Item.collections,
        fetchedAt: response.Item.fetchedAt,
        cached: true,
      };
    }

    return null; // Cache expired
  } catch (error) {
    console.error('Failed to get cached stats:', error.message);
    return null;
  }
}

/**
 * Store stats in DynamoDB cache
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain
 * @param {Object} stats - The stats to cache
 */
async function cacheStats(appId, shop, stats) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + CACHE_TTL_SECONDS;

    // Use composite key: {appId}:{shop}
    const cacheKey = `${appId}:${shop}`;
    await docClient.send(new PutCommand({
      TableName: CACHE_TABLE,
      Item: {
        shop: cacheKey,
        appId,
        shopDomain: shop,
        products: stats.products,
        orders: stats.orders,
        customers: stats.customers,
        variants: stats.variants,
        collections: stats.collections,
        fetchedAt: stats.fetchedAt,
        ttl,
        cachedAt: new Date().toISOString(),
      },
    }));
  } catch (error) {
    console.error('Failed to cache stats:', error.message);
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Verify session token authentication (now async for multi-app support)
    const authError = await requireSessionToken(event);
    if (authError) {
      return authError;
    }

    // Get shop and app from verified session token
    const shop = getShopFromToken(event);
    const appId = getAppFromToken(event);

    if (!shop) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Could not determine shop from session token' }),
      };
    }

    if (!appId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Could not determine app from session token' }),
      };
    }

    const params = event.queryStringParameters || {};
    const { refresh } = params;
    const forceRefresh = refresh === 'true' || refresh === '1';

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedStats = await getCachedStats(appId, shop);
      if (cachedStats) {
        console.log(`Returning cached stats for ${shop} (app: ${appId})`);
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            stats: cachedStats,
            cached: true,
          }),
        };
      }
    }

    // Get access token from Parameter Store
    console.log(`Looking up credentials for shop=${shop}, appId=${appId}`);
    let accessToken;
    try {
      accessToken = await getShopAccessToken(appId, shop);
      console.log(`Retrieved access token prefix: ${accessToken?.substring(0, 10)}`);
    } catch (error) {
      console.error(`Failed to get access token for ${shop} (app: ${appId}):`, error.message);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Store not found',
          message: 'No credentials found for this store'
        }),
      };
    }

    // Fetch all stats in parallel
    const [productCount, orderCount, customerCount, variantCount, collectionCount] = await Promise.all([
      getProductCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch product count:', err.message);
        return null;
      }),
      getOrderCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch order count:', err.message);
        return null;
      }),
      getCustomerCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch customer count:', err.message);
        return null;
      }),
      getVariantCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch variant count:', err.message);
        return null;
      }),
      getCollectionCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch collection count:', err.message);
        return null;
      }),
    ]);

    const stats = {
      products: productCount,
      orders: orderCount,
      customers: customerCount,
      variants: variantCount,
      collections: collectionCount,
      fetchedAt: new Date().toISOString(),
    };

    // Check if any core stats failed to load
    const hasErrors = productCount === null || orderCount === null || customerCount === null;

    // Cache the stats (only if no errors)
    if (!hasErrors) {
      await cacheStats(appId, shop, stats);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: !hasErrors,
        stats,
        cached: false,
        ...(hasErrors && { warning: 'Some statistics could not be loaded' }),
      }),
    };
  } catch (error) {
    console.error('Stats error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
