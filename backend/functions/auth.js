/**
 * Auth Lambda Function
 * Initiates the Shopify OAuth flow
 * Supports multiple app registrations via dynamic credential loading
 */

const crypto = require('crypto');
const { getAppCredentials } = require('./credentials');

exports.handler = async (event) => {
  try {
    const { shop, app } = event.queryStringParameters || {};

    if (!shop) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing shop parameter' }),
      };
    }

    if (!app) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing app parameter' }),
      };
    }

    // Validate shop domain format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!shopRegex.test(shop)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid shop domain' }),
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

    const appUrl = process.env.APP_URL;

    // Required OAuth scopes for your app
    const scopes = 'read_products,write_products,read_orders,read_customers';

    // Generate a random nonce for security
    const nonce = crypto.randomBytes(16).toString('hex');

    // Encode app identifier in the state parameter (JSON, base64 encoded)
    const stateData = JSON.stringify({ nonce, app });
    const state = Buffer.from(stateData).toString('base64');

    // Build the OAuth authorization URL
    const redirectUri = `${appUrl}/callback`;
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${appCredentials.clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

    console.log(`Initiating OAuth for shop ${shop} with app ${app}`);

    return {
      statusCode: 302,
      headers: {
        Location: authUrl,
        'Set-Cookie': `shopify_oauth_state=${nonce}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      },
      body: '',
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', message: error.message }),
    };
  }
};
