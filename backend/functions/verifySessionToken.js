/**
 * Session Token Verification Utility
 * Verifies Shopify session tokens (JWT) for authenticated API requests
 * Supports multiple app registrations via dynamic credential loading
 *
 * Session tokens are issued by Shopify App Bridge and contain:
 * - iss: The shop's admin domain (e.g., "https://myshop.myshopify.com/admin")
 * - dest: The shop's domain (e.g., "https://myshop.myshopify.com")
 * - aud: The API key of the app
 * - sub: The user ID (shop owner or staff member)
 * - exp: Expiration timestamp
 * - iat: Issued at timestamp
 * - nbf: Not before timestamp
 * - jti: Unique token ID
 * - sid: Session ID
 */

const crypto = require('crypto');
const { SSMClient, GetParametersByPathCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
const PREFIX = process.env.PARAMETER_STORE_PREFIX || '/shopify/duxly-connection';

// Cache for app credentials (client_id -> { appId, clientSecret })
let appCredentialsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all app credentials from Parameter Store
 * Returns a map of client_id -> { appId, clientSecret }
 */
async function loadAppCredentials() {
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
        clientSecret: app.clientSecret,
      };
    }
  }

  appCredentialsCache = credentialsByClientId;
  cacheTimestamp = now;
  return credentialsByClientId;
}

/**
 * Find app credentials by client_id (from JWT aud claim)
 */
async function findAppByClientId(clientId) {
  const credentials = await loadAppCredentials();
  return credentials[clientId] || null;
}

/**
 * Base64URL decode (JWT uses base64url encoding, not standard base64)
 */
function base64UrlDecode(str) {
  // Replace URL-safe characters with standard base64 characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(base64 + padding, 'base64').toString('utf8');
}

/**
 * Verify the JWT signature
 */
function verifySignature(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  const signatureInput = `${header}.${payload}`;

  // Create HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    // Convert to base64url
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Extract shop domain from session token claims
 * The dest claim contains the full URL, we need just the domain
 */
function extractShopFromToken(dest) {
  if (!dest) return null;

  try {
    // dest is like "https://myshop.myshopify.com"
    const url = new URL(dest);
    return url.hostname;
  } catch {
    // If not a valid URL, try to extract domain directly
    return dest.replace(/^https?:\/\//, '').split('/')[0];
  }
}

/**
 * Verify a Shopify session token
 *
 * @param {string} authHeader - The Authorization header value ("Bearer <token>")
 * @param {string} apiKey - The Shopify API key for this app
 * @param {string} apiSecret - The Shopify API secret for this app
 * @param {string} expectedShop - Optional: The shop domain to verify against
 * @returns {{ valid: boolean, shop: string|null, error: string|null, payload: object|null }}
 */
function verifySessionToken(authHeader, apiKey, apiSecret, expectedShop = null) {
  // Check header format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      shop: null,
      error: 'Missing or invalid Authorization header',
      payload: null,
    };
  }

  const token = authHeader.replace('Bearer ', '');

  // Split token into parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    return {
      valid: false,
      shop: null,
      error: 'Invalid token format',
      payload: null,
    };
  }

  // Verify signature
  try {
    if (!verifySignature(token, apiSecret)) {
      return {
        valid: false,
        shop: null,
        error: 'Invalid token signature',
        payload: null,
      };
    }
  } catch (error) {
    return {
      valid: false,
      shop: null,
      error: `Signature verification failed: ${error.message}`,
      payload: null,
    };
  }

  // Decode and parse payload
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch (error) {
    return {
      valid: false,
      shop: null,
      error: 'Failed to decode token payload',
      payload: null,
    };
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return {
      valid: false,
      shop: null,
      error: 'Token has expired',
      payload,
    };
  }

  // Check not-before time
  if (payload.nbf && payload.nbf > now) {
    return {
      valid: false,
      shop: null,
      error: 'Token not yet valid',
      payload,
    };
  }

  // Verify audience (API key)
  if (payload.aud !== apiKey) {
    return {
      valid: false,
      shop: null,
      error: 'Token audience does not match API key',
      payload,
    };
  }

  // Extract shop from dest claim
  const shop = extractShopFromToken(payload.dest);
  if (!shop) {
    return {
      valid: false,
      shop: null,
      error: 'Could not extract shop from token',
      payload,
    };
  }

  // Verify shop matches expected shop if provided
  if (expectedShop && shop !== expectedShop) {
    return {
      valid: false,
      shop,
      error: 'Token shop does not match requested shop',
      payload,
    };
  }

  return {
    valid: true,
    shop,
    error: null,
    payload,
  };
}

/**
 * Decode JWT payload without verification (to get the aud claim for app lookup)
 */
function decodeTokenPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

/**
 * Express/Lambda middleware-style function for verifying session tokens
 * Supports multiple app registrations by looking up credentials from the JWT aud claim
 * Returns an error response object if invalid, or null if valid
 *
 * @param {object} event - Lambda event object
 * @param {string} expectedShop - Optional: The shop to verify against
 * @returns {Promise<{ statusCode: number, headers: object, body: string }|null>}
 */
async function requireSessionToken(event, expectedShop = null) {
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  // Get Authorization header (handle case-insensitive headers)
  const headers = event.headers || {};
  const authHeader = headers.Authorization || headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' }),
    };
  }

  const token = authHeader.replace('Bearer ', '');

  // Decode payload to get the aud (client_id) claim
  const payload = decodeTokenPayload(token);
  if (!payload || !payload.aud) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized', message: 'Invalid token format' }),
    };
  }

  // Look up app credentials by client_id
  const appCredentials = await findAppByClientId(payload.aud);
  if (!appCredentials) {
    console.warn(`No app found for client_id: ${payload.aud}`);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized', message: 'Unknown app' }),
    };
  }

  // Verify token with the correct app secret
  const result = verifySessionToken(authHeader, payload.aud, appCredentials.clientSecret, expectedShop);

  if (!result.valid) {
    console.warn('Session token verification failed:', result.error);
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized', message: result.error }),
    };
  }

  // Store appId in event for later use
  event._appId = appCredentials.appId;
  event._shop = result.shop;

  return null; // Token is valid
}

/**
 * Get the shop from a verified session token
 *
 * @param {object} event - Lambda event object
 * @returns {string|null} - The shop domain or null if token is invalid
 */
function getShopFromToken(event) {
  // If requireSessionToken was already called, use cached value
  if (event._shop) {
    return event._shop;
  }
  return null;
}

/**
 * Get the app ID from a verified session token
 *
 * @param {object} event - Lambda event object
 * @returns {string|null} - The app ID or null if token is invalid
 */
function getAppFromToken(event) {
  // If requireSessionToken was already called, use cached value
  if (event._appId) {
    return event._appId;
  }
  return null;
}

module.exports = {
  verifySessionToken,
  requireSessionToken,
  getShopFromToken,
  getAppFromToken,
  extractShopFromToken,
  findAppByClientId,
};
