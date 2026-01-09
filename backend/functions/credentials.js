/**
 * Credentials Helper Module
 * Handles loading and storing credentials for multi-app support
 */

const { SSMClient, GetParameterCommand, PutParameterCommand, DeleteParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const PREFIX = process.env.PARAMETER_STORE_PREFIX || '/shopify/duxly-connection';

/**
 * Get app credentials (client_id and client_secret) from Parameter Store
 * @param {string} appId - The app identifier (e.g., 'duxly-connection-hart-beach')
 * @returns {Promise<{clientId: string, clientSecret: string}>}
 */
async function getAppCredentials(appId) {
  const [clientIdResponse, clientSecretResponse] = await Promise.all([
    ssmClient.send(new GetParameterCommand({
      Name: `${PREFIX}/apps/${appId}/client-id`,
      WithDecryption: false,
    })),
    ssmClient.send(new GetParameterCommand({
      Name: `${PREFIX}/apps/${appId}/client-secret`,
      WithDecryption: true,
    })),
  ]);

  return {
    clientId: clientIdResponse.Parameter.Value,
    clientSecret: clientSecretResponse.Parameter.Value,
  };
}

/**
 * Get shop access token from Parameter Store
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain (e.g., 'myshop.myshopify.com')
 * @returns {Promise<string>} The access token
 */
async function getShopAccessToken(appId, shop) {
  const response = await ssmClient.send(new GetParameterCommand({
    Name: `${PREFIX}/shops/${appId}/${shop}/access-token`,
    WithDecryption: true,
  }));

  return response.Parameter.Value;
}

/**
 * Store shop credentials in Parameter Store
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain
 * @param {string} accessToken - The Shopify access token
 * @param {string} scopes - The granted OAuth scopes
 */
async function storeShopCredentials(appId, shop, accessToken, scopes) {
  const basePath = `${PREFIX}/shops/${appId}/${shop}`;

  await Promise.all([
    ssmClient.send(new PutParameterCommand({
      Name: `${basePath}/access-token`,
      Value: accessToken,
      Type: 'SecureString',
      Description: `Shopify access token for ${shop} (app: ${appId})`,
      Overwrite: true,
    })),
    ssmClient.send(new PutParameterCommand({
      Name: `${basePath}/scopes`,
      Value: scopes,
      Type: 'String',
      Description: `Shopify scopes for ${shop} (app: ${appId})`,
      Overwrite: true,
    })),
    ssmClient.send(new PutParameterCommand({
      Name: `${basePath}/installed-at`,
      Value: new Date().toISOString(),
      Type: 'String',
      Description: `Installation timestamp for ${shop} (app: ${appId})`,
      Overwrite: true,
    })),
  ]);
}

/**
 * Delete shop credentials from Parameter Store
 * @param {string} appId - The app identifier
 * @param {string} shop - The shop domain
 */
async function deleteShopCredentials(appId, shop) {
  const basePath = `${PREFIX}/shops/${appId}/${shop}`;

  const deletePromises = [
    'access-token',
    'scopes',
    'installed-at',
  ].map(param =>
    ssmClient.send(new DeleteParameterCommand({
      Name: `${basePath}/${param}`,
    })).catch(err => {
      // Ignore if parameter doesn't exist
      if (err.name !== 'ParameterNotFound') {
        throw err;
      }
    })
  );

  await Promise.all(deletePromises);
}

module.exports = {
  getAppCredentials,
  getShopAccessToken,
  storeShopCredentials,
  deleteShopCredentials,
  PREFIX,
};
