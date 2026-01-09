/**
 * Auth Lambda Function
 * Initiates the Shopify OAuth flow
 */

const crypto = require('crypto');

exports.handler = async (event) => {
  try {
    const { shop } = event.queryStringParameters || {};

    if (!shop) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing shop parameter' }),
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

    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.APP_URL;

    // Required OAuth scopes for your app
    const scopes = 'read_products,write_products,read_orders,write_orders';

    // Generate a random state parameter for security
    const state = crypto.randomBytes(16).toString('hex');

    // Build the OAuth authorization URL
    const redirectUri = `${appUrl}/callback`;
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

    // In production, store the state parameter in a database or session
    // For this template, we'll return it and validate it in the callback

    return {
      statusCode: 302,
      headers: {
        Location: authUrl,
        'Set-Cookie': `shopify_oauth_state=${state}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      },
      body: '',
    };
  } catch (error) {
    console.error('Auth error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
