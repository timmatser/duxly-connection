/**
 * Callback Lambda Function
 * Handles the OAuth callback and stores credentials in Parameter Store
 * Supports multiple app registrations via dynamic credential loading
 */

const crypto = require('crypto');
const { getAppCredentials, storeShopCredentials } = require('./credentials');

/**
 * Parse state parameter to extract app identifier
 * @param {string} state - Base64 encoded JSON state
 * @returns {{nonce: string, app: string}}
 */
function parseState(state) {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error('Invalid state parameter');
  }
}

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(shop, code, clientId, clientSecret) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to exchange code: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Verify HMAC signature from Shopify
 */
function verifyHmac(queryParams, hmac, apiSecret) {
  // Remove hmac and signature from params
  const params = { ...queryParams };
  delete params.hmac;
  delete params.signature;

  // Sort and build query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');

  // Generate HMAC
  const hash = crypto
    .createHmac('sha256', apiSecret)
    .update(sortedParams)
    .digest('hex');

  return hash === hmac;
}

exports.handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const { code, hmac, shop, state } = params;

    // Validate required parameters
    if (!code || !hmac || !shop || !state) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Parse state to get app identifier
    let stateData;
    try {
      stateData = parseState(state);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid state parameter' }),
      };
    }

    const { app } = stateData;
    if (!app) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing app identifier in state' }),
      };
    }

    // Load app credentials from Parameter Store
    let appCredentials;
    try {
      appCredentials = await getAppCredentials(app);
    } catch (error) {
      console.error(`Failed to load credentials for app ${app}:`, error.message);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'App not found', message: `No credentials found for app: ${app}` }),
      };
    }

    // Verify HMAC with the correct app secret
    if (!verifyHmac(params, hmac, appCredentials.clientSecret)) {
      console.error(`HMAC verification failed for shop ${shop}, app ${app}`);
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid HMAC signature' }),
      };
    }

    // Exchange code for access token
    console.log(`Exchanging code for token: shop=${shop}, clientId=${appCredentials.clientId}`);
    const tokenData = await exchangeCodeForToken(
      shop,
      code,
      appCredentials.clientId,
      appCredentials.clientSecret
    );

    console.log(`Token exchange response: access_token prefix=${tokenData.access_token?.substring(0, 10)}, scope=${tokenData.scope}`);

    // Store credentials in Parameter Store under /shops/{appId}/{shop}/
    await storeShopCredentials(app, shop, tokenData.access_token, tokenData.scope);

    console.log(`Successfully stored credentials for shop: ${shop}, app: ${app}`);

    // Redirect to frontend with success message
    const frontendUrl = process.env.FRONTEND_URL;
    return {
      statusCode: 302,
      headers: {
        Location: `${frontendUrl}?shop=${shop}&app=${app}&installed=true`,
      },
      body: '',
    };
  } catch (error) {
    console.error('Callback error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Failed to complete installation',
        message: error.message
      }),
    };
  }
};
