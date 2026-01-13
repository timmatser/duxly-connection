# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Duxly Connection is a public Shopify embedded app built with a serverless AWS architecture. It handles OAuth installation flow, stores credentials in AWS Parameter Store, and provides a React frontend hosted on CloudFront.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shopify Admin                            │
│                    (Embedded App Frame)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     CloudFront (CDN)                            │
│                 Frontend URL (React App)                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     S3 Bucket                                   │
│              Static React App (Vite build)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway                                 │
│  /auth → AuthFunction       /stats → StatsFunction              │
│  /callback → CallbackFunction   /disconnect → DisconnectFunction│
│  /proxy → ProxyFunction                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   Lambda Functions                              │
│    (Node.js 20.x, deployed via CDK)                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          ▼                                 ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Parameter Store    │          │    DynamoDB         │
│  (Access tokens,    │          │  (Stats cache)      │
│   scopes, metadata) │          │                     │
└─────────────────────┘          └─────────────────────┘
```

## Key Components

- **backend/functions/**: Lambda handlers for OAuth (`auth.js`, `callback.js`), API proxy (`proxy.js`), stats (`stats.js`), and disconnect (`disconnect.js`)
- **frontend/src/**: React app with Shopify Polaris UI and App Bridge integration
- **infrastructure/**: AWS CDK stack defining all AWS resources

## Common Commands

### Infrastructure (from `/infrastructure`)
```bash
npm install              # Install CDK dependencies
npm run deploy           # Deploy AWS stack (cdk deploy)
npm run destroy          # Tear down AWS stack
npm run synth            # Synthesize CloudFormation template
```

### Frontend (from `/frontend`)
```bash
npm install              # Install dependencies
npm run dev              # Local dev server (Vite)
npm run build            # Production build
aws s3 sync dist s3://[BUCKET_NAME] --delete  # Deploy to S3
```

### Backend (from `/backend`)
```bash
npm install              # Install Lambda dependencies
```

### Viewing Logs
```bash
aws logs tail /aws/lambda/duxly-connection-AuthFunctionA1CD5E0F-* --follow
aws logs tail /aws/lambda/duxly-connection-CallbackFunctionA4FB3452-* --follow
aws logs tail /aws/lambda/duxly-connection-StatsFunctionE4A6FC3A-* --follow
```

## Environment Variables

**Root `.env`** (for CDK deployment):
```
AWS_REGION=eu-central-1
PARAMETER_STORE_PREFIX=/shopify/duxly-connection
```

Note: `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are no longer used in CDK deployment. Credentials are loaded dynamically from Parameter Store per app registration.

**Frontend `.env`**:
```
VITE_SHOPIFY_API_KEY=xxx          # Client ID for this app registration
VITE_API_URL=https://[API_GATEWAY_URL]/prod
VITE_APP_ID=duxly-connection      # App identifier for multi-app support
```

## OAuth Installation Flow

1. Merchant clicks install → frontend redirects to `/auth?shop=xxx&app={VITE_APP_ID}`
2. `auth.js` Lambda loads credentials for that app, redirects to Shopify OAuth with scopes
3. Merchant approves → Shopify redirects to `/callback` with code and state (containing app ID)
4. `callback.js` extracts app from state, loads client-secret, exchanges code for token
5. Stores credentials at `/shopify/duxly-connection/shops/{appId}/{shop}/access-token`
6. Redirects to frontend with `?shop=xxx&app={appId}&installed=true`

## Parameter Store Structure

**App credentials** (one per app registration):
```
/shopify/duxly-connection/apps/{appId}/
  ├── client-id (String)
  ├── client-secret (SecureString)
  ├── name (String)
  └── status (String)
```

**Shop credentials** (per app per shop):
```
/shopify/duxly-connection/shops/{appId}/{shop-domain}/
  ├── access-token (SecureString)
  ├── scopes (String)
  └── installed-at (String, ISO timestamp)
```

## AWS Region

Default: `eu-central-1`

## Deployed Resources

Current deployment (managed by CDK stack `duxly-connection`):

| Resource | Value |
|----------|-------|
| **API Gateway URL** | `https://gtuslbu8gk.execute-api.eu-central-1.amazonaws.com/prod/` |
| **S3 Bucket** | `duxly-connection-frontendbucketefe2e19c-u6sysn8kdrtf` |
| **CloudFront Distribution ID** | `E1A90KM23V5N3Y` |
| **CloudFront Domain** | `d2lfwrslf9fyor.cloudfront.net` |
| **DynamoDB Table** | `shopify-stats-cache` |

**Note:** `connections.duxly.eu` is a separate Admin UI for internal management, not related to the Shopify embedded app.

### GDPR Webhook URLs
```
customers/data_request: https://gtuslbu8gk.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_data_request
customers/redact: https://gtuslbu8gk.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_redact
shop/redact: https://gtuslbu8gk.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/shop_redact
```

## Shopify App Configuration

Required settings in Shopify Partners Dashboard (managed via TOML files):
- **App URL**: `https://d2lfwrslf9fyor.cloudfront.net` (shared CloudFront distribution)
- **Allowed redirect URL**: `https://gtuslbu8gk.execute-api.eu-central-1.amazonaws.com/prod/callback`
- **Embedded app**: Enabled

Deploy changes using: `shopify app deploy --config shopify.app.{appId}.toml --force`

## Multi-App Architecture (Temporary)

This app uses multiple Shopify app registrations as a workaround until Shopify approves the public listing.

### Why Multiple Registrations?

Shopify custom distribution apps can only be installed on **one shop**. To test with multiple clients before public listing approval, we create separate app registrations (e.g., `duxly-connection`, `duxly-connection-hart-beach`).

Each registration:
- Has unique `client_id` and `client_secret`
- Points to the **same backend** Lambda functions
- Points to the **same frontend** CloudFront distribution

### How It Works

**Backend (shared):**
- All app registrations share the same Lambda functions
- Lambda functions load credentials dynamically from Parameter Store based on app ID
- Session token verification looks up the app by JWT `aud` claim (client_id)
- Cache keys include app ID to keep data separate: `{appId}:{shop}`

**Frontend (shared):**
- All app registrations share the same S3 bucket + CloudFront distribution (`d2lfwrslf9fyor.cloudfront.net`)
- Frontend reads `SHOPIFY_API_KEY` from Shopify App Bridge context (no build-time baking needed)
- App ID is derived from the client_id at runtime

### Session Token Authentication

For authenticated endpoints (stats, disconnect):
1. Frontend includes session token in `Authorization: Bearer <token>` header
2. Backend decodes JWT to get `aud` claim (client_id)
3. Looks up app credentials by client_id in Parameter Store
4. Verifies signature with the correct app's client_secret
5. Extracts shop from `dest` claim, app ID from lookup result

### Adding a New App Registration

1. **Create Shopify app** in Partners Dashboard
2. **Store credentials in Parameter Store:**
   ```bash
   aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/client-id" --value "xxx" --type String
   aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/client-secret" --value "xxx" --type SecureString
   aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/name" --value "App Name" --type String
   aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/status" --value "active" --type String
   ```
3. **Create TOML file** `shopify.app.{appId}.toml` with:
   - `application_url = "https://d2lfwrslf9fyor.cloudfront.net"`
   - `redirect_urls` pointing to the shared API Gateway callback
   - GDPR webhook URLs
4. **Deploy with Shopify CLI:**
   ```bash
   shopify app deploy --config shopify.app.{appId}.toml --force
   ```

### Future: Public App

Once approved as a public app:
- Consolidate to a single app registration
- All shops use the same `VITE_APP_ID`
- Credential paths simplify to single app
- Multi-app logic remains but only one app will exist
