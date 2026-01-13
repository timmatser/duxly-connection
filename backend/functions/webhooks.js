/**
 * Webhook Handler for Shopify App Events
 * Handles app/uninstalled webhook to clean up credentials immediately
 */

const crypto = require('crypto');
const { deleteShopCredentials, findAppByClientId, PREFIX } = require('./credentials');
const { SSMClient, GetParametersByPathCommand, DeleteParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });

/**
 * Verify Shopify webhook HMAC signature
 */
function verifyWebhookHmac(body, hmacHeader, apiSecret) {
  const hash = crypto
    .createHmac('sha256', apiSecret)
    .update(body, 'utf8')
    .digest('base64');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

/**
 * Delete all credentials for a shop across all apps
 * @param {string} shopDomain - The shop domain
 */
async function deleteAllShopCredentials(shopDomain) {
  const deletedParams = [];
  let nextToken;

  do {
    const response = await ssmClient.send(new GetParametersByPathCommand({
      Path: `${PREFIX}/shops/`,
      Recursive: true,
      NextToken: nextToken,
    }));

    for (const param of response.Parameters || []) {
      // Check if this parameter belongs to the shop being uninstalled
      if (param.Name.includes(`/${shopDomain}/`)) {
        await ssmClient.send(new DeleteParameterCommand({
          Name: param.Name,
        }));
        deletedParams.push(param.Name);
        console.log(`Deleted parameter: ${param.Name}`);
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return deletedParams;
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Get headers (normalize to lowercase)
    const headers = {};
    for (const [key, value] of Object.entries(event.headers || {})) {
      headers[key.toLowerCase()] = value;
    }

    const webhookTopic = headers['x-shopify-topic'];
    const hmacHeader = headers['x-shopify-hmac-sha256'];
    const shopDomain = headers['x-shopify-shop-domain'];
    const apiVersion = headers['x-shopify-api-version'];

    console.log(`Received webhook: topic=${webhookTopic}, shop=${shopDomain}`);

    if (!webhookTopic || !hmacHeader || !shopDomain) {
      console.error('Missing required webhook headers');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required headers' }),
      };
    }

    const body = event.body || '';

    // For app/uninstalled, we need to verify with the correct app's secret
    // The webhook includes the API key in the payload
    let payload = {};
    try {
      payload = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse webhook body');
    }

    // Handle app/uninstalled webhook
    if (webhookTopic === 'app/uninstalled') {
      console.log(`App uninstalled for shop: ${shopDomain}`);

      // Delete all credentials for this shop
      const deletedParams = await deleteAllShopCredentials(shopDomain);

      console.log(`Deleted ${deletedParams.length} parameters for shop ${shopDomain}`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Credentials deleted for ${shopDomain}`,
          deleted: deletedParams.length,
        }),
      };
    }

    // Unknown webhook topic
    console.log(`Unknown webhook topic: ${webhookTopic}`);
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Webhook received' }),
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
