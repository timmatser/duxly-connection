/**
 * Proxy Lambda Function
 * Handles app proxy requests from Shopify storefront
 * Can be used to fetch data for custom storefronts
 * Supports multiple app registrations via dynamic credential loading
 */

const crypto = require('crypto');
const { getShopAccessToken, getAppCredentials } = require('./credentials');

/**
 * Verify proxy signature from Shopify
 */
async function verifyProxySignature(queryParams, signature, appId) {
  // Load app credentials to get the secret
  const appCredentials = await getAppCredentials(appId);

  // Remove signature from params
  const params = { ...queryParams };
  delete params.signature;

  // Sort and build query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('');

  // Generate signature
  const hash = crypto
    .createHmac('sha256', appCredentials.clientSecret)
    .update(sortedParams)
    .digest('hex');

  return hash === signature;
}

/**
 * Make API call to Shopify
 */
async function callShopifyApi(shop, accessToken, endpoint, method = 'GET', body = null) {
  const url = `https://${shop}/admin/api/2024-01/${endpoint}`;

  const options = {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.statusText}`);
  }

  return await response.json();
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const { shop, app, signature } = params;

    if (!shop || !app || !signature) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required parameters (shop, app, signature)' }),
      };
    }

    // Verify the signature with the correct app secret
    const isValid = await verifyProxySignature(params, signature, app);
    if (!isValid) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Get access token from Parameter Store
    const accessToken = await getShopAccessToken(app, shop);

    // Parse request body if present
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { endpoint = 'products.json', method = 'GET' } = requestBody;

    // Call Shopify API
    const data = await callShopifyApi(shop, accessToken, endpoint, method);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
};
