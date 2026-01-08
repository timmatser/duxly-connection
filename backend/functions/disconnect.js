/**
 * Disconnect Lambda Function
 * Handles disconnection by deleting credentials from Parameter Store
 */

const { SSMClient, DeleteParameterCommand, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Delete a parameter if it exists (don't fail if missing)
 */
async function deleteParameterIfExists(paramName) {
  try {
    // First check if it exists
    await ssmClient.send(new GetParameterCommand({ Name: paramName, WithDecryption: true }));
    // If exists, delete it
    await ssmClient.send(new DeleteParameterCommand({ Name: paramName }));
    console.log(`Deleted parameter: ${paramName}`);
    return true;
  } catch (error) {
    if (error.name === 'ParameterNotFound') {
      console.log(`Parameter not found (already deleted): ${paramName}`);
      return false;
    }
    throw error;
  }
}

/**
 * Delete cached stats from DynamoDB
 */
async function deleteCachedStats(shop) {
  const tableName = process.env.STATS_CACHE_TABLE;
  if (!tableName) {
    console.log('No stats cache table configured, skipping cache deletion');
    return;
  }

  try {
    await docClient.send(new DeleteCommand({
      TableName: tableName,
      Key: { shop },
    }));
    console.log(`Deleted cached stats for: ${shop}`);
  } catch (error) {
    console.warn(`Failed to delete cached stats: ${error.message}`);
    // Don't fail the disconnect if cache deletion fails
  }
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { shop } = body;

    if (!shop) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Missing shop parameter' }),
      };
    }

    const prefix = process.env.PARAMETER_STORE_PREFIX || '/shopify/clients';
    const deletedParams = [];
    const failedParams = [];

    // List of parameters to delete for this shop
    const paramNames = [
      `${prefix}/${shop}/access-token`,
      `${prefix}/${shop}/scopes`,
      `${prefix}/${shop}/installed-at`,
    ];

    // Delete each parameter
    for (const paramName of paramNames) {
      try {
        const deleted = await deleteParameterIfExists(paramName);
        if (deleted) {
          deletedParams.push(paramName);
        }
      } catch (error) {
        console.error(`Failed to delete ${paramName}:`, error);
        failedParams.push(paramName);
      }
    }

    // Delete cached stats
    await deleteCachedStats(shop);

    console.log(`Disconnect completed for shop: ${shop}`);
    console.log(`Deleted ${deletedParams.length} parameters`);

    if (failedParams.length > 0) {
      return {
        statusCode: 207, // Multi-Status - partial success
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          message: 'Partial disconnect - some parameters could not be deleted',
          deleted: deletedParams,
          failed: failedParams,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Store disconnected successfully',
        shop,
        deletedParams: deletedParams.length,
      }),
    };
  } catch (error) {
    console.error('Disconnect error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to disconnect store',
        message: error.message,
      }),
    };
  }
};
