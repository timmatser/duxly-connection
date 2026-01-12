/**
 * Auth Lambda Function
 * Initiates the Shopify OAuth flow
 * Supports multiple app registrations via dynamic credential loading
 * 
 * Accepts either:
 * - `app` parameter: The app ID (e.g., 'duxly-connection-hart-beach')
 * - `client_id` parameter: The Shopify API key, used to look up the app ID
 */

const crypto = require('crypto');
const { getAppCredentials, findAppByClientId } = require('./credentials');

exports.handler = async (event) => {
  try {
    const { shop, app, client_id } = event.queryStringParameters || {};

    if (!shop) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing shop parameter' }),
      };
    }

    if (!app && !client_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing app or client_id parameter' }),
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
    // Either by app ID directly, or by looking up using client_id
    let appCredentials;
    let appId;

    if (client_id) {
      // Look up app by client_id (Shopify API key)
      try {
        const appInfo = await findAppByClientId(client_id);
        if (!appInfo) {
          console.error(`No app found for client_id: ${client_id}`);
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'App not found', message: `No app registered with client_id: ${client_id}` }),
          };
        }
        appId = appInfo.appId;
        appCredentials = {
          clientId: appInfo.clientId,
          clientSecret: appInfo.clientSecret,
        };
        console.log(`Resolved client_id ${client_id} to app ${appId}`);
      } catch (error) {
        console.error(`Failed to look up app by client_id ${client_id}:`, error.message);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: 'Failed to look up app', message: error.message }),
        };
      }
    } else {
      // Use app ID directly
      appId = app;
      try {
        appCredentials = await getAppCredentials(appId);
      } catch (error) {
        console.error(`Failed to load credentials for app ${appId}:`, error.message);
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'App not found', message: `No credentials found for app: ${appId}` }),
        };
      }
    }

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, ''); // Remove trailing slash

    // Required OAuth scopes for your app
    const scopes = 'read_products,write_products,read_orders,read_customers';

    // Generate a random nonce for security
    const nonce = crypto.randomBytes(16).toString('hex');

    // Encode app identifier in the state parameter (JSON, base64 encoded)
    // Always use appId here so callback knows which app to store credentials for
    const stateData = JSON.stringify({ nonce, app: appId });
    const state = Buffer.from(stateData).toString('base64');

    // Build the OAuth authorization URL
    const redirectUri = `${appUrl}/callback`;
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${appCredentials.clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

    console.log(`Initiating OAuth for shop ${shop} with app ${appId}`);

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
