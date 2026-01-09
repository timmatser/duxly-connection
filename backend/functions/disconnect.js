/**
 * Disconnect Lambda Function
 * Handles disconnection by deleting credentials from Parameter Store
 * Supports multiple app registrations via dynamic credential loading
 *
 * AUTHENTICATION: Requires valid Shopify session token in Authorization header
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { requireSessionToken, getShopFromToken, getAppFromToken } = require('./verifySessionToken');
const { deleteShopCredentials } = require('./credentials');

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Delete cached stats from DynamoDB
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain
 */
async function deleteCachedStats(appId, shop) {
  const tableName = process.env.STATS_CACHE_TABLE;
  if (!tableName) {
    console.log('No stats cache table configured, skipping cache deletion');
    return;
  }

  try {
    // Use composite key: {appId}:{shop}
    const cacheKey = `${appId}:${shop}`;
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { shop: cacheKey },
    }));
    console.log(`Deleted cached stats for: ${shop} (app: ${appId})`);
  } catch (error) {
    console.warn(`Failed to delete cached stats: ${error.message}`);
    // Don't fail the disconnect if cache deletion fails
  }
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  // Handle CORS preflight
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

    // Delete shop credentials from Parameter Store
    try {
      await deleteShopCredentials(appId, shop);
      console.log(`Deleted credentials for shop: ${shop} (app: ${appId})`);
    } catch (error) {
      console.error(`Failed to delete credentials for ${shop} (app: ${appId}):`, error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Failed to delete credentials',
          message: error.message,
        }),
      };
    }

    // Delete cached stats
    await deleteCachedStats(appId, shop);

    console.log(`Disconnect completed for shop: ${shop} (app: ${appId})`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'Store disconnected successfully',
        shop,
        app: appId,
      }),
    };
  } catch (error) {
    console.error('Disconnect error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to disconnect store',
        message: error.message,
      }),
    };
  }
};
