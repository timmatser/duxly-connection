# Quick Start Guide - Testing & Deployment

This guide will walk you through testing and deploying your Shopify app template from scratch.

## Prerequisites Checklist

- [ ] AWS CLI configured with credentials (`aws configure`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)
- [ ] Shopify Partners account (free at https://partners.shopify.com/)
- [ ] Development store created in Shopify Partners

## Step 1: Create Shopify App (5 minutes)

1. **Go to Shopify Partners**: https://partners.shopify.com/
2. **Create App**:
   - Click "Apps" in sidebar
   - Click "Create app"
   - Choose "Create app manually"
   - Name: "Duxly Connection" (or your preferred name)
   - Select "Embedded app"

3. **Get your credentials**:
   - Once created, go to "App setup" tab
   - Copy your **Client ID** (API Key)
   - Click "Show" to reveal **Client secret** (API Secret)
   - **Keep these safe!** You'll need them in the next step

## Step 2: Configure Environment (2 minutes)

```bash
cd ~/dev/shopify-app-template

# Create .env file
cp .env.example .env
```

Edit `.env` and add your Shopify credentials:

```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
AWS_REGION=eu-central-1
```

## Step 3: Deploy Backend Infrastructure (5-10 minutes)

```bash
# Install infrastructure dependencies
cd infrastructure
npm install

# Bootstrap CDK (ONLY FIRST TIME per AWS account/region)
npx cdk bootstrap

# Deploy the stack
npm run deploy
```

**Important**: Save the outputs from this command:
```
Outputs:
ShopifyAppStack.ApiUrl = https://abc123.execute-api.eu-central-1.amazonaws.com/prod
ShopifyAppStack.FrontendUrl = https://d111xyz.cloudfront.net
ShopifyAppStack.FrontendBucketName = shopifyappstack-frontendbucket12345-abc
```

## Step 4: Update Configuration with Deployment URLs

Update your `.env` file with the deployment outputs:

```env
SHOPIFY_API_KEY=your_client_id_here
SHOPIFY_API_SECRET=your_client_secret_here
AWS_REGION=eu-central-1
APP_URL=https://abc123.execute-api.eu-central-1.amazonaws.com/prod
FRONTEND_URL=https://d111xyz.cloudfront.net
```

**Re-deploy to update Lambda environment variables**:
```bash
cd infrastructure
npm run deploy
cd ..
```

## Step 5: Build and Deploy Frontend (3 minutes)

```bash
cd frontend

# Create frontend .env
cp .env.example .env
```

Edit `frontend/.env`:
```env
VITE_SHOPIFY_API_KEY=your_client_id_here
```

**Build and deploy**:
```bash
npm install
npm run build

# Deploy to S3 (replace bucket name with yours from Step 3)
aws s3 sync dist s3://shopifyappstack-frontendbucket12345-abc --delete
```

## Step 6: Configure Shopify App URLs (3 minutes)

Go back to Shopify Partners dashboard:

1. **App setup** tab:
   - **App URL**: `https://d111xyz.cloudfront.net` (your FrontendUrl)
   - **Allowed redirection URL(s)**:
     ```
     https://abc123.execute-api.eu-central-1.amazonaws.com/prod/callback
     ```
     (your ApiUrl + /callback)

2. **Configuration** tab:
   - **Embedded app**: Make sure it's enabled
   - **App home**: Set to your App URL

3. **API access** tab:
   - **Scopes**: Configure the scopes you need:
     - `read_products`
     - `write_products`
     - `read_orders`
     - (Add others as needed)

4. **Save all changes**

## Step 7: Test Installation (5 minutes)

### 7.1 Install on Development Store

1. In Shopify Partners, go to your app
2. Click "Select store" → Choose your development store
3. Click "Install app"
4. You'll be redirected through the OAuth flow
5. Approve the permissions
6. You should see the Dashboard with "Installation successful!" message

### 7.2 Verify Credentials in Parameter Store

```bash
# Get your shop domain (e.g., my-dev-store.myshopify.com)
SHOP_DOMAIN="your-store.myshopify.com"

# Use the helper script
./scripts/get-credentials.sh $SHOP_DOMAIN
```

Expected output:
```
🔍 Retrieving credentials for: your-store.myshopify.com

Access Token:
shpat_abc123xyz...

Scopes:
read_products,write_products,read_orders

Installed at:
2026-01-07T10:30:45.123Z

✅ Credentials retrieved successfully
```

### 7.3 Test with Utility Client

**Node.js test**:
```bash
cd utils
npm install

# Create test script
cat > test.js << 'EOF'
const ShopifyClient = require('./shopify-client');

async function test() {
  const client = new ShopifyClient('your-store.myshopify.com');

  try {
    const products = await client.getProducts(5);
    console.log('✅ Successfully retrieved products:', products.products.length);
    console.log('First product:', products.products[0]?.title || 'No products');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
EOF

node test.js
```

**Python test**:
```bash
# Install dependencies
pip3 install boto3 requests

# Create test script
cat > test.py << 'EOF'
from shopify_client import ShopifyClient

client = ShopifyClient('your-store.myshopify.com')

try:
    products = client.get_products(limit=5)
    print(f"✅ Successfully retrieved {len(products['products'])} products")
    if products['products']:
        print(f"First product: {products['products'][0]['title']}")
except Exception as e:
    print(f"❌ Error: {e}")
EOF

python3 test.py
```

## Step 8: Testing Checklist

- [ ] OAuth flow completes successfully
- [ ] Dashboard loads in Shopify admin
- [ ] "Installation successful!" banner appears
- [ ] Access token stored in Parameter Store
- [ ] Can retrieve token with `get-credentials.sh` script
- [ ] Node.js client can fetch products
- [ ] Python client can fetch products

## Common Issues & Solutions

### Issue: "Invalid redirect_uri"
**Solution**: Make sure the redirect URL in Shopify Partners exactly matches:
```
https://[your-api-gateway-url]/prod/callback
```
No trailing slash!

### Issue: "HMAC validation failed"
**Solution**:
1. Double-check your API secret is correct in `.env`
2. Re-deploy: `cd infrastructure && npm run deploy`

### Issue: Frontend shows "Loading..."
**Solution**:
1. Make sure you deployed frontend to S3
2. Check CloudFront is serving the files: visit your FrontendUrl in browser
3. Try invalidating CloudFront cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id [your-id] --paths "/*"
   ```

### Issue: "Access Denied" when retrieving from Parameter Store
**Solution**: Make sure your AWS CLI user has SSM permissions:
```bash
aws sts get-caller-identity  # Verify your identity
aws ssm describe-parameters --max-results 1  # Test SSM access
```

### Issue: Lambda function timeout
**Solution**: Check Lambda logs:
```bash
aws logs tail /aws/lambda/ShopifyAppStack-CallbackFunction --follow
```

## Development Workflow

### Making Changes to Backend

1. Edit Lambda function in `backend/functions/`
2. Deploy changes:
   ```bash
   cd infrastructure
   npm run deploy
   ```

### Making Changes to Frontend

1. Edit React components in `frontend/src/`
2. Test locally:
   ```bash
   cd frontend
   npm run dev  # Opens on localhost:3000
   ```
3. Deploy changes:
   ```bash
   npm run build
   aws s3 sync dist s3://[bucket-name] --delete
   ```

### Viewing Logs

**Lambda logs**:
```bash
# Auth function
aws logs tail /aws/lambda/ShopifyAppStack-AuthFunction --follow

# Callback function
aws logs tail /aws/lambda/ShopifyAppStack-CallbackFunction --follow

# Proxy function
aws logs tail /aws/lambda/ShopifyAppStack-ProxyFunction --follow
```

**API Gateway logs**:
```bash
aws logs tail /aws/apigateway/ShopifyApi --follow
```

## Using in Custom Tooling

Once installed, your custom tools can access the credentials:

### Lambda Function Example

```javascript
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

exports.handler = async (event) => {
  const shop = 'customer-store.myshopify.com';
  const ssm = new SSMClient({ region: 'eu-central-1' });

  const response = await ssm.send(new GetParameterCommand({
    Name: `/shopify/clients/${shop}/access-token`,
    WithDecryption: true,
  }));

  const accessToken = response.Parameter.Value;

  // Use token to call Shopify API
  // ...
};
```

### Python Script Example

```python
import boto3

ssm = boto3.client('ssm', region_name='eu-central-1')
shop = 'customer-store.myshopify.com'

response = ssm.get_parameter(
    Name=f'/shopify/clients/{shop}/access-token',
    WithDecryption=True
)

access_token = response['Parameter']['Value']

# Use token to call Shopify API
# ...
```

## Production Deployment

### Before Going to Production

1. **Set up custom domain**:
   - Frontend: Use Route53 + ACM certificate with CloudFront
   - Backend: Use API Gateway custom domain

2. **Enable logging**:
   - CloudWatch Logs for all Lambda functions
   - API Gateway access logs
   - CloudFront access logs

3. **Add monitoring**:
   - CloudWatch alarms for errors
   - Lambda metrics monitoring
   - Cost alerts

4. **Security hardening**:
   - Enable WAF on CloudFront
   - Review IAM permissions (principle of least privilege)
   - Set up VPC for Lambda functions (optional)
   - Enable Parameter Store audit logging

5. **Submit for Shopify App Store review** (if public app):
   - Complete app listing
   - Add privacy policy
   - Add support contact
   - Test on multiple stores

## Cost Estimates

### Expected Costs (1,000 installations)

- **Lambda**: ~$0.20/month (1M requests)
- **API Gateway**: ~$3.50/month
- **S3**: ~$0.10/month
- **CloudFront**: ~$1.00/month
- **Parameter Store**: Free (under 10,000 params)

**Total**: ~$5/month for 1,000 active installations

### Monitoring Costs

```bash
# Get current month costs
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE
```

## Next Steps

1. **Add webhooks**: Listen for shop events (orders, products, etc.)
2. **Add GDPR endpoints**: Required for Shopify apps (data request, deletion)
3. **Add app uninstall handler**: Clean up Parameter Store on uninstall
4. **Add frontend features**: Build your custom functionality
5. **Set up CI/CD**: Automate deployments with GitHub Actions

## Support

- **Shopify API Docs**: https://shopify.dev/docs
- **AWS CDK Docs**: https://docs.aws.amazon.com/cdk/
- **AWS Lambda Docs**: https://docs.aws.amazon.com/lambda/

## Cleanup (Destroy Everything)

If you want to remove all resources:

```bash
# Delete frontend from S3
aws s3 rm s3://[bucket-name] --recursive

# Destroy infrastructure
cd infrastructure
npm run destroy

# Delete parameters from Parameter Store
aws ssm delete-parameter --name "/shopify/clients/[shop]/access-token"
aws ssm delete-parameter --name "/shopify/clients/[shop]/scopes"
aws ssm delete-parameter --name "/shopify/clients/[shop]/installed-at"
```
