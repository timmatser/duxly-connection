# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Duxly Connection is a Shopify embedded app using **custom distribution** (one app registration per client). Built with a serverless AWS architecture, it handles OAuth installation flow, stores credentials in AWS Parameter Store, and provides a React frontend hosted on CloudFront. All client apps share the same backend and frontend — only the Shopify credentials differ.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shopify Admin                            │
│                    (Embedded App Frame)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     CloudFront (CDN)                            │
│           d23dbydr2m94fv.cloudfront.net                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     S3 Bucket                                   │
│   duxly-connection-frontendbucket-nxwzpx7vznif                  │
│              Static React App (Vite build)                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          API Gateway (lf3gyfp569)                               │
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
- **frontend/src/config/appContent.js**: Per-client Documentation + "What's running" landscape content (see below)
- **infrastructure/**: AWS CDK stack defining all AWS resources

## Per-Client Content (Documentation & Landscape)

The embedded Dashboard shows up to three Polaris tabs: **Overview** (always), **What's running**
(the client-friendly landscape) and **Documentation** (the client-facing manual). The landscape and
documentation tabs only appear when the current app has content configured.

All of this is **static, front-end-only content** — no backend, Lambda, SSM, or DynamoDB involved.
It's keyed by Shopify `client_id`, which the frontend already knows at runtime (`getApiKey()` in
`frontend/src/App.jsx` reads `?client_id=…` from the URL, set by each app's `application_url` in its
TOML). `Dashboard.jsx` looks the content up via `getAppContent(clientId)`.

- Config: `frontend/src/config/appContent.js` — `APP_CONTENT[clientId] = { appId, name, documentation, landscape }`.
- Renderers: `frontend/src/components/DocumentationTab.jsx`, `frontend/src/components/LandscapeTab.jsx`.
- Vintage (`15aaeb2a0727f22bf224d544483e58ef`) and 2ehands (`5925fb6a5a22cf0efbedc885d0d831c9`)
  share one Dutch client manual; source of truth for maintainers is ClickUp doc `8cnw4jt-13735`.
- Apps without an entry fall back to `DEFAULT_CONTENT` → only the Overview tab shows.

**To add a new client's content:**
1. Find the `client_id` in that app's `shopify.app.<name>.toml`.
2. Add an `APP_CONTENT[client_id]` entry (see the section/integration schemas documented at the top
   of `appContent.js`).
3. Rebuild + redeploy the frontend (`cd frontend && npm run build` → `aws s3 sync …` → CloudFront
   invalidation; see Frontend commands above).

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
aws s3 sync dist s3://duxly-connection-frontendbucket-nxwzpx7vznif --delete  # Deploy to S3
aws cloudfront create-invalidation --distribution-id E2EF6R9ZCH1PXM --paths "/*"  # Invalidate cache
```

### Backend (from `/backend`)
```bash
npm install              # Install Lambda dependencies
```

### Viewing Logs
```bash
aws logs tail /aws/lambda/duxly-connection-AuthFunction-HTFYK9zvjytO --follow
aws logs tail /aws/lambda/duxly-connection-CallbackFunction-yGKUxp35WgM4 --follow
aws logs tail /aws/lambda/duxly-connection-StatsFunction-tTbBUVh0dPTk --follow
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
VITE_SHOPIFY_API_KEY=79f672bb13bc6ab7fa86755927ff9a6f
VITE_API_URL=https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod
VITE_APP_ID=duxly-connection
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
  ├── status (String)
  ├── created-at (String, ISO timestamp)
  ├── created-by (String, email)
  ├── distribution (String, "custom")
  └── partners-link (String, URL to Partners Dashboard)
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

Current deployment (managed by CDK stack `duxly-connection`, last redeployed 2026-03-20):

| Resource | Value |
|----------|-------|
| **API Gateway URL** | `https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/` |
| **S3 Bucket** | `duxly-connection-frontendbucket-nxwzpx7vznif` |
| **CloudFront Distribution ID** | `E2EF6R9ZCH1PXM` |
| **CloudFront Domain** | `d23dbydr2m94fv.cloudfront.net` |
| **DynamoDB Table** | `shopify-stats-cache` |

**Note:** `connections.duxly.eu` is a separate Admin UI for internal management, not related to the Shopify embedded app.

### GDPR Webhook URLs
```
customers/data_request: https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_data_request
customers/redact: https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_redact
shop/redact: https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/shop_redact
```

### CDK Deploy Warning

Running `cdk deploy` recreates resources with new IDs (CloudFront, S3, API Gateway). After any CDK deploy:
1. **Redeploy frontend** to the new S3 bucket (`npm run build` + `aws s3 sync`)
2. **Update all TOML files** with new CloudFront and API Gateway URLs
3. **Redeploy all TOMLs** with `shopify app deploy`
4. **Verify** Lambda env vars (especially `FRONTEND_URL` on CallbackFunction)

## Shopify App Configuration

Required settings in Shopify Partners Dashboard (managed via TOML files):
- **App URL**: `https://d23dbydr2m94fv.cloudfront.net` (shared CloudFront distribution)
- **Allowed redirect URL**: `https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/callback`
- **Embedded app**: Enabled

Deploy changes using: `shopify app deploy --config shopify.app.{appId}.toml --force`

## Multi-App Custom Distribution

Each Shopify client gets their own custom distribution app registration. All registrations share the same backend (Lambda) and frontend (CloudFront/S3).

### Current App Registrations

| App ID | Client | Shop | TOML |
|--------|--------|------|------|
| `duxly-connection` | Test/Demo | duxlydemo, 3erymh-v1, etc. | `shopify.app.duxly-connection.toml` |
| `duxly-connection-hart-beach` | Hart Beach | https-www-hartbeach-nl | `shopify.app.hart-beach.toml` |
| `duxly-connection-strand-hb` | Strand HB | hart-beach-strand | `shopify.app.strand-hb.toml` |
| `duxly-connection-thestore` | The Store Woerden | https-www-thestorewoerden-nl | `shopify.app.thestore.toml` |
| `duxly-connection-2ehands` | 2eHands Sieraden | 2ehandssieraden | `shopify.app.2ehands.toml` |
| `duxly-connection-curls-control` | Curls Control | curlscontrol | `shopify.app.curls-control.toml` |
| `duxly-connection-vintage` | Vintage Jewellery | vintagejewellery-shop | `shopify.app.vintage.toml` |
| `duxly-connection-flowerfamily` | The Flower Family | dm65sx-t3 | `shopify.app.flowerfamily.toml` |
| `duxly-connection-acelera` | Acelera | acelera-cc | `shopify.app.acelera.toml` |
| `duxly-connection-liefs-lies` | Liefs lies | liefs-lies (perm. `70h1yr-mc`) | `shopify.app.liefs-lies.toml` |
| `dancohr` | Dancohr | dancohr | — |

### How It Works

**Backend (shared):**
- All app registrations share the same Lambda functions
- Lambda functions load credentials dynamically from Parameter Store based on app ID
- Session token verification looks up the app by JWT `aud` claim (client_id)
- Cache keys include app ID to keep data separate: `{appId}:{shop}`

**Frontend (shared):**
- All app registrations share the same S3 bucket + CloudFront distribution
- Frontend reads `SHOPIFY_API_KEY` from Shopify App Bridge context (no build-time baking needed)
- App ID is derived from the client_id at runtime

### Session Token Authentication

For authenticated endpoints (stats, disconnect):
1. Frontend includes session token in `Authorization: Bearer <token>` header
2. Backend decodes JWT to get `aud` claim (client_id)
3. Looks up app credentials by client_id in Parameter Store
4. Verifies signature with the correct app's client_secret
5. Extracts shop from `dest` claim, app ID from lookup result

## Installing a New Custom App for a Client

### Step 1: Create app in Shopify Partners
Go to https://partners.shopify.com/2604455/apps → Create app → Custom distribution

### Step 2: Store credentials in Parameter Store
```bash
aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/client-id" --value "xxx" --type String --region eu-central-1
aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/client-secret" --value "xxx" --type SecureString --region eu-central-1
aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/name" --value "Duxly Connection {ClientName}" --type String --region eu-central-1
aws ssm put-parameter --name "/shopify/duxly-connection/apps/{appId}/status" --value "active" --type String --region eu-central-1
```

### Step 3: Create TOML file
Create `shopify.app.{short-name}.toml` using this template:
```toml
# Shopify App Configuration for: Duxly Connection {ClientName}

name = "Duxly Connection {ClientName}"
client_id = "{CLIENT_ID}"
handle = "duxly-connection-{short-name}"

application_url = "https://d23dbydr2m94fv.cloudfront.net/?client_id={CLIENT_ID}"
embedded = true

[access_scopes]
scopes = "read_products,write_products,read_orders,read_customers,read_translations,write_translations,read_locales"
use_legacy_install_flow = false

[auth]
redirect_urls = [
    "https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/callback"
]

[webhooks]
api_version = "2024-01"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks"

[webhooks.privacy_compliance]
customer_data_request_url = "https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_data_request"
customer_deletion_url = "https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/customers_redact"
shop_deletion_url = "https://lf3gyfp569.execute-api.eu-central-1.amazonaws.com/prod/webhooks/gdpr/shop_redact"

[build]
automatically_update_urls_on_dev = true
```

### Step 4: Deploy to Shopify Partners
```bash
shopify app deploy --config shopify.app.{short-name}.toml --force
```

### Step 5: Install on the shop
The merchant opens the app in their Shopify admin → approves the OAuth scopes → app is connected.

If the app was just created, the merchant may need to install it first via the Partners Dashboard install link or by navigating to the app in their admin.
