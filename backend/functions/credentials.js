/**
 * Credentials Helper Module
 * Handles loading and storing credentials for multi-app support
 */

const { SSMClient, GetParameterCommand, GetParametersByPathCommand, PutParameterCommand, DeleteParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const PREFIX = process.env.PARAMETER_STORE_PREFIX || '/shopify/duxly-connection';

// Cache for app credentials lookup by client_id
let appCredentialsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

/**
 * Load all app credentials from Parameter Store
 * Returns a map of client_id -> { appId, clientId, clientSecret }
 */
async function loadAllAppCredentials() {
  const now = Date.now();
  if (appCredentialsCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return appCredentialsCache;
  }

  const apps = {};
  let nextToken;

  do {
    const response = await ssmClient.send(new GetParametersByPathCommand({
      Path: `${PREFIX}/apps/`,
      Recursive: true,
      WithDecryption: true,
      NextToken: nextToken,
    }));

    for (const param of response.Parameters || []) {
      // Parse path: /shopify/duxly-connection/apps/{appId}/{key}
      const parts = param.Name.replace(`${PREFIX}/apps/`, '').split('/');
      if (parts.length >= 2) {
        const appId = parts[0];
        const key = parts[1];
        if (!apps[appId]) {
          apps[appId] = { appId };
        }
        if (key === 'client-id') {
          apps[appId].clientId = param.Value;
        } else if (key === 'client-secret') {
          apps[appId].clientSecret = param.Value;
        }
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  // Create lookup map by client_id
  const credentialsByClientId = {};
  for (const appId of Object.keys(apps)) {
    const app = apps[appId];
    if (app.clientId && app.clientSecret) {
      credentialsByClientId[app.clientId] = {
        appId: app.appId,
        clientId: app.clientId,
        clientSecret: app.clientSecret,
      };
    }
  }

  appCredentialsCache = credentialsByClientId;
  cacheTimestamp = now;
  return credentialsByClientId;
}

/**
 * Find app credentials by client_id (Shopify API key)
 * @param {string} clientId - The Shopify client_id / API key
 * @returns {Promise<{appId: string, clientId: string, clientSecret: string}|null>}
 */
async function findAppByClientId(clientId) {
  const credentials = await loadAllAppCredentials();
  return credentials[clientId] || null;
}

module.exports = {
  getAppCredentials,
  getShopAccessToken,
  storeShopCredentials,
  deleteShopCredentials,
  findAppByClientId,
  PREFIX,
};
