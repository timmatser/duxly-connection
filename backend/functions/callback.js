/**
 * Callback Lambda Function
 * Handles the OAuth callback and stores credentials in Parameter Store
 */

const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
const crypto = require('crypto');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(shop, code) {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  const appUrl = process.env.APP_URL;

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code: code,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Store credentials in AWS Parameter Store
 */
async function storeCredentials(shop, accessToken, scopes) {
  const prefix = process.env.PARAMETER_STORE_PREFIX || '/shopify/clients';

  // Store access token
  const tokenParam = new PutParameterCommand({
    Name: `${prefix}/${shop}/access-token`,
    Value: accessToken,
    Type: 'SecureString',
    Description: `Shopify access token for ${shop}`,
    Overwrite: true,
    Tags: [
      { Key: 'App', Value: 'Shopify' },
      { Key: 'Shop', Value: shop },
    ],
  });

  await ssmClient.send(tokenParam);

  // Store scopes for reference
  const scopesParam = new PutParameterCommand({
    Name: `${prefix}/${shop}/scopes`,
    Value: scopes,
    Type: 'String',
    Description: `Shopify scopes for ${shop}`,
    Overwrite: true,
    Tags: [
      { Key: 'App', Value: 'Shopify' },
      { Key: 'Shop', Value: shop },
    ],
  });

  await ssmClient.send(scopesParam);

  // Store installation timestamp
  const timestampParam = new PutParameterCommand({
    Name: `${prefix}/${shop}/installed-at`,
    Value: new Date().toISOString(),
    Type: 'String',
    Description: `Installation timestamp for ${shop}`,
    Overwrite: true,
    Tags: [
      { Key: 'App', Value: 'Shopify' },
      { Key: 'Shop', Value: shop },
    ],
  });

  await ssmClient.send(timestampParam);
}

/**
 * Verify HMAC signature from Shopify
 */
function verifyHmac(queryParams, hmac) {
  const apiSecret = process.env.SHOPIFY_API_SECRET;

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
    if (!code || !hmac || !shop) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Verify HMAC
    if (!verifyHmac(params, hmac)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid HMAC signature' }),
      };
    }

    // In production, verify the state parameter matches what was stored
    // For this template, we'll skip this check

    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(shop, code);

    // Store credentials in Parameter Store
    await storeCredentials(shop, tokenData.access_token, tokenData.scope);

    console.log(`Successfully stored credentials for shop: ${shop}`);

    // Redirect to frontend with success message
    const frontendUrl = process.env.FRONTEND_URL;
    return {
      statusCode: 302,
      headers: {
        Location: `${frontendUrl}?shop=${shop}&installed=true`,
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
