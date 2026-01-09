/**
 * Stats Lambda Function
 * Fetches store statistics (Products, Orders, Customers) from Shopify Admin API
 * Handles rate limiting with retry logic
 * Implements caching via DynamoDB to reduce API calls
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const API_VERSION = '2024-01';
const CACHE_TABLE = process.env.STATS_CACHE_TABLE || 'shopify-stats-cache';
const CACHE_TTL_SECONDS = parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10); // Default 1 hour

/**
 * Get access token from Parameter Store
 */
async function getAccessToken(shop) {
  const prefix = process.env.PARAMETER_STORE_PREFIX || '/shopify/clients';

  const command = new GetParameterCommand({
    Name: `${prefix}/${shop}/access-token`,
    WithDecryption: true,
  });

  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

/**
 * Verify HMAC signature from Shopify App Bridge request
 */
function verifySignature(queryParams, signature) {
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiSecret) return true;

  const params = { ...queryParams };
  delete params.signature;

  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

  const hash = crypto
    .createHmac('sha256', apiSecret)
    .update(sortedParams)
    .digest('hex');

  return hash === signature;
}

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
 * Fetch inventory items count using GraphQL
 */
async function getInventoryItemCount(shop, accessToken) {
  const url = `https://${shop}/admin/api/${API_VERSION}/graphql.json`;

  const query = `
    query {
      inventoryItemsCount {
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

  return data.data?.inventoryItemsCount?.count || 0;
}

/**
 * Get cached stats from DynamoDB
 * @returns {Object|null} Cached stats if valid, null if expired or not found
 */
async function getCachedStats(shop) {
  try {
    const response = await docClient.send(new GetCommand({
      TableName: CACHE_TABLE,
      Key: { shop },
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
        inventoryItems: response.Item.inventoryItems,
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
 */
async function cacheStats(shop, stats) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + CACHE_TTL_SECONDS;

    await docClient.send(new PutCommand({
      TableName: CACHE_TABLE,
      Item: {
        shop,
        products: stats.products,
        orders: stats.orders,
        customers: stats.customers,
        variants: stats.variants,
        collections: stats.collections,
        inventoryItems: stats.inventoryItems,
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
    const params = event.queryStringParameters || {};
    const { shop, signature, refresh } = params;
    const forceRefresh = refresh === 'true' || refresh === '1';

    if (!shop) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameter: shop' }),
      };
    }

    // Verify signature if provided
    if (signature && !verifySignature(params, signature)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedStats = await getCachedStats(shop);
      if (cachedStats) {
        console.log(`Returning cached stats for ${shop}`);
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
    let accessToken;
    try {
      accessToken = await getAccessToken(shop);
    } catch (error) {
      console.error('Failed to get access token:', error.message);
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
    const [productCount, orderCount, customerCount, variantCount, collectionCount, inventoryItemCount] = await Promise.all([
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
      getInventoryItemCount(shop, accessToken).catch(err => {
        console.error('Failed to fetch inventory item count:', err.message);
        return null;
      }),
    ]);

    const stats = {
      products: productCount,
      orders: orderCount,
      customers: customerCount,
      variants: variantCount,
      collections: collectionCount,
      inventoryItems: inventoryItemCount,
      fetchedAt: new Date().toISOString(),
    };

    // Check if any core stats failed to load
    const hasErrors = productCount === null || orderCount === null || customerCount === null;

    // Cache the stats (only if no errors)
    if (!hasErrors) {
      await cacheStats(shop, stats);
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
