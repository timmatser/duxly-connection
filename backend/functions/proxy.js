/**
 * Proxy Lambda Function
 * Handles app proxy requests from Shopify storefront
 * Can be used to fetch data for custom storefronts
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });

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
 * Verify proxy signature from Shopify
 */
function verifyProxySignature(queryParams, signature) {
  const apiSecret = process.env.SHOPIFY_API_SECRET;

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
    .createHmac('sha256', apiSecret)
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
    const { shop, signature } = params;

    if (!shop || !signature) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Verify the signature
    if (!verifyProxySignature(params, signature)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Get access token from Parameter Store
    const accessToken = await getAccessToken(shop);

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
