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
aws logs tail /aws/lambda/ShopifyAppStack-AuthFunction --follow
aws logs tail /aws/lambda/ShopifyAppStack-CallbackFunction --follow
aws logs tail /aws/lambda/ShopifyAppStack-StatsFunction --follow
```

## Environment Variables

**Root `.env`** (for CDK deployment):
```
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx
AWS_REGION=eu-central-1
APP_URL=https://[API_GATEWAY_URL]/prod
FRONTEND_URL=https://[CLOUDFRONT_URL]
```

**Frontend `.env`**:
```
VITE_SHOPIFY_API_KEY=xxx
VITE_API_URL=https://[API_GATEWAY_URL]/prod
```

## OAuth Installation Flow

1. Merchant clicks install → frontend redirects to `/auth?shop=xxx`
2. `auth.js` Lambda redirects to Shopify OAuth with scopes
3. Merchant approves → Shopify redirects to `/callback` with code
4. `callback.js` exchanges code for token, stores in Parameter Store at `/shopify/clients/{shop}/access-token`
5. Redirects to frontend with `?shop=xxx&installed=true`

## Parameter Store Structure

Credentials stored at: `/shopify/clients/{shop-domain}/`
- `access-token` (SecureString)
- `scopes` (String)
- `installed-at` (String, ISO timestamp)

## AWS Region

Default: `eu-central-1`

## Shopify App Configuration

Required settings in Shopify Partners Dashboard:
- **App URL**: CloudFront distribution URL
- **Allowed redirect URL**: `{API_GATEWAY_URL}/prod/callback`
- **Embedded app**: Enabled
