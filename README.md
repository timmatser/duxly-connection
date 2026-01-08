# Duxly Connection - Public Shopify App

A serverless Shopify embedded app built with AWS Lambda, API Gateway, and Parameter Store. This app is designed to be a **public Shopify app** that can be installed by any merchant and listed on the Shopify App Store.

## Architecture

- **Frontend**: React app with Shopify Polaris UI, hosted on S3 + CloudFront
- **Backend**: AWS Lambda functions for OAuth flow and API proxy
- **Storage**: AWS Parameter Store for secure credential storage
- **Infrastructure**: AWS SAM (Serverless Application Model)
- **GDPR Compliance**: Built-in webhook handlers for mandatory GDPR requirements

## Features

- OAuth 2.0 installation flow (multi-tenant support)
- Automatic credential storage in AWS Parameter Store
- Embedded app interface using Shopify App Bridge
- Serverless architecture (scales automatically)
- Secure credential management
- **GDPR Compliance**: Ready for public app submission
  - `customers/data_request` webhook handler
  - `customers/redact` webhook handler
  - `shop/redact` webhook handler (auto-deletes shop data on uninstall)
- Ready for production deployment and App Store submission

## Prerequisites

1. **AWS Account** with CLI configured
   ```bash
   aws configure
   ```

2. **Node.js 18+** and npm installed

3. **Shopify Partners Account** - [Sign up here](https://partners.shopify.com/)

4. **AWS CDK** - Install globally:
   ```bash
   npm install -g aws-cdk
   ```

## Project Structure

```
shopify-app-template/
├── backend/                  # Lambda functions
│   └── functions/
│       ├── auth.js          # OAuth initiation
│       ├── callback.js      # OAuth callback + credential storage
│       └── proxy.js         # API proxy for custom tooling
├── frontend/                 # React embedded app
│   └── src/
│       ├── App.jsx
│       └── components/
├── infrastructure/           # AWS CDK infrastructure
│   ├── bin/
│   └── lib/
└── deploy.sh                # Deployment script
```

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd shopify-app-template
```

### 2. Create Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click "Apps" → "Create app"
3. Choose "Create app manually"
4. Fill in app name and select "Embedded app"
5. Note your **API Key** and **API Secret**

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Shopify credentials:

```env
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
AWS_REGION=eu-central-1
```

### 4. Bootstrap AWS CDK (First time only)

If you haven't used AWS CDK in your account/region before:

```bash
cd infrastructure
npm install
npx cdk bootstrap
cd ..
```

### 5. Deploy Infrastructure

Deploy the backend infrastructure:

```bash
cd infrastructure
npm install
npm run deploy
```

This will output:
- **ApiUrl**: Your API Gateway endpoint
- **FrontendUrl**: Your CloudFront distribution URL
- **FrontendBucketName**: S3 bucket for frontend

**Important**: Save these values for the next steps!

### 6. Update Environment Variables

Update your `.env` file with the deployment outputs:

```env
APP_URL=https://your-api-id.execute-api.eu-central-1.amazonaws.com/prod
FRONTEND_URL=https://your-distribution-id.cloudfront.net
```

Re-deploy to update Lambda environment variables:

```bash
cd infrastructure
npm run deploy
cd ..
```

### 7. Configure Frontend

Create `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_SHOPIFY_API_KEY=your_api_key_here
```

Build and deploy frontend:

```bash
npm install
npm run build

# Get bucket name from CDK output
aws s3 sync dist s3://[FrontendBucketName] --delete
```

### 8. Configure Shopify App Settings

In your Shopify Partners dashboard, update your app configuration:

1. **App URL**: `https://your-distribution-id.cloudfront.net`
2. **Allowed redirection URL(s)**:
   ```
   https://your-api-id.execute-api.eu-central-1.amazonaws.com/prod/callback
   ```
3. **App setup** → **Embedded app**: Enable
4. **Distribution** → **App proxy**: (Optional)
   - Subpath prefix: `apps/duxly`
   - Proxy URL: `https://your-api-id.execute-api.eu-central-1.amazonaws.com/prod/proxy`

### 9. Test Installation

1. In Shopify Partners, click "Test on development store"
2. Select a development store or create a new one
3. Click "Install app"
4. Complete OAuth flow
5. Verify credentials stored in Parameter Store:

```bash
aws ssm get-parameter --name "/shopify/clients/[shop-name].myshopify.com/access-token" --with-decryption
```

## How It Works

### Installation Flow

1. Merchant clicks "Install app" in Shopify admin
2. Redirected to `/auth` Lambda function
3. Redirected to Shopify OAuth authorization page
4. Merchant approves scopes
5. Shopify redirects to `/callback` Lambda function
6. Lambda exchanges code for access token
7. **Credentials stored in AWS Parameter Store**:
   - `/shopify/clients/{shop}/access-token` (encrypted)
   - `/shopify/clients/{shop}/scopes`
   - `/shopify/clients/{shop}/installed-at`
8. Merchant redirected to embedded app frontend

### Accessing Credentials in Custom Tooling

Your custom tooling can retrieve credentials from Parameter Store:

```javascript
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssm = new SSMClient({ region: 'eu-central-1' });

async function getShopifyToken(shop) {
  const response = await ssm.send(new GetParameterCommand({
    Name: `/shopify/clients/${shop}/access-token`,
    WithDecryption: true,
  }));
  return response.Parameter.Value;
}
```

Python example:

```python
import boto3

ssm = boto3.client('ssm', region_name='eu-central-1')

def get_shopify_token(shop):
    response = ssm.get_parameter(
        Name=f'/shopify/clients/{shop}/access-token',
        WithDecryption=True
    )
    return response['Parameter']['Value']
```

## API Endpoints

### GET /auth
Initiates OAuth flow
- Query params: `shop` (required)
- Redirects to Shopify authorization

### GET /callback
OAuth callback handler
- Exchanges code for token
- Stores credentials in Parameter Store
- Redirects to frontend

### POST /proxy
App proxy endpoint (optional)
- Proxies requests to Shopify API
- Validates signatures
- Uses stored credentials

## Customization

### Adding More OAuth Scopes

Edit `backend/functions/auth.js`:

```javascript
const scopes = 'read_products,write_products,read_orders,write_orders';
```

Available scopes: [Shopify OAuth Scopes](https://shopify.dev/docs/api/usage/access-scopes)

### Storing Additional Data

Edit `backend/functions/callback.js` to store more parameters:

```javascript
const customParam = new PutParameterCommand({
  Name: `${prefix}/${shop}/custom-data`,
  Value: JSON.stringify({ /* your data */ }),
  Type: 'SecureString',
  Overwrite: true,
});
await ssmClient.send(customParam);
```

### Customizing Frontend

The frontend uses Shopify Polaris components. Edit:
- `frontend/src/components/Dashboard.jsx` - Main UI
- `frontend/src/App.jsx` - App configuration

## GDPR Compliance (Required for Public Apps)

This app includes built-in GDPR compliance webhook handlers, which are **mandatory** for apps listed on the Shopify App Store.

### Webhook Endpoints

After deployment, configure these URLs in your Shopify Partner Dashboard under **App setup → Protected customer data access**:

| Webhook | Endpoint |
|---------|----------|
| Customer data request | `https://{API_GATEWAY_URL}/prod/webhooks/gdpr/customers_data_request` |
| Customer data erasure | `https://{API_GATEWAY_URL}/prod/webhooks/gdpr/customers_redact` |
| Shop data erasure | `https://{API_GATEWAY_URL}/prod/webhooks/gdpr/shop_redact` |

### How It Works

- **customers/data_request**: When a customer requests their data, the app responds that no customer-specific data is stored (only shop-level tokens).
- **customers/redact**: When a customer requests to be forgotten, the app confirms no customer data exists to delete.
- **shop/redact**: When a shop uninstalls the app (after 48 hours), all stored credentials are automatically deleted from Parameter Store.

## Security Best Practices

1. **Never commit secrets**: Use `.env` files (already in `.gitignore`)
2. **Use SecureString**: All sensitive parameters use SecureString type
3. **Verify HMAC**: All Shopify requests verify HMAC signatures
4. **HTTPS only**: All endpoints use HTTPS
5. **IAM permissions**: Lambda functions have minimal required permissions
6. **Parameter tagging**: All parameters tagged for easy management
7. **GDPR Compliance**: Automatic data deletion on app uninstall

## Cost Estimation

This serverless architecture is very cost-effective:

- **Lambda**: ~$0.20 per million requests
- **API Gateway**: ~$3.50 per million requests
- **S3 + CloudFront**: ~$0.085/GB + $0.01/10,000 requests
- **Parameter Store**: Free tier (10,000 parameters)

Expected monthly cost for 1,000 installations: **< $5**

## Deployment Automation

Use the included deployment script:

```bash
./deploy.sh
```

This script:
1. Installs all dependencies
2. Builds frontend
3. Deploys infrastructure with CDK
4. Displays next steps

## Troubleshooting

### Lambda Function Errors

View logs:
```bash
aws logs tail /aws/lambda/ShopifyAppStack-AuthFunction --follow
```

### Frontend Not Loading

1. Check CloudFront distribution status
2. Verify S3 bucket contents: `aws s3 ls s3://[bucket-name]/`
3. Check browser console for errors

### OAuth Errors

1. Verify redirect URL in Shopify Partners matches exactly
2. Check Lambda logs for HMAC verification errors
3. Ensure API key/secret are correct

### Parameter Store Access Denied

Verify Lambda IAM role has SSM permissions:
```bash
aws iam get-role-policy --role-name ShopifyAppStack-CallbackFunction-Role --policy-name [policy-name]
```

## Maintenance

### Updating Shopify API Version

Edit `backend/functions/proxy.js`:
```javascript
const url = `https://${shop}/admin/api/2024-10/${endpoint}`;
```

### Rotating Credentials

If you need to rotate Shopify API credentials:
1. Update in Shopify Partners
2. Update `.env` file
3. Re-deploy: `cd infrastructure && npm run deploy`

## Support

For issues or questions:
- Check [Shopify API Documentation](https://shopify.dev/docs)
- Review [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- Open an issue in this repository

## License

MIT
