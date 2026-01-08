# Testing Guide

Quick reference for testing your Shopify app deployment.

## Pre-Deployment Tests

### Test 1: AWS Access
```bash
# Verify AWS credentials work
aws sts get-caller-identity

# Test Parameter Store access
aws ssm describe-parameters --max-results 1
```

Expected: Your AWS account ID and parameter store access

### Test 2: Node.js Dependencies
```bash
# Test backend dependencies install
cd backend && npm install && cd ..

# Test infrastructure dependencies install
cd infrastructure && npm install && cd ..

# Test frontend dependencies install
cd frontend && npm install && cd ..
```

Expected: No errors, all dependencies installed

## Deployment Tests

### Test 3: Infrastructure Deployment
```bash
cd infrastructure
npm run synth  # Synthesize CloudFormation template

# Check for errors in synthesis
echo $?  # Should output 0
```

Expected: CloudFormation template generated in `cdk.out/`

### Test 4: Lambda Function Packaging
```bash
# Check Lambda functions are valid JavaScript
cd backend/functions

# Test syntax
node -c auth.js && echo "✅ auth.js valid"
node -c callback.js && echo "✅ callback.js valid"
node -c proxy.js && echo "✅ proxy.js valid"
```

Expected: All functions have valid syntax

## Post-Deployment Tests

### Test 5: API Gateway Endpoint
```bash
# Get API URL from CDK output
API_URL="your-api-url-here"

# Test auth endpoint (should redirect or return error about missing shop)
curl -v "$API_URL/auth"
```

Expected: HTTP 400 with error about missing shop parameter

### Test 6: API Gateway with Shop Parameter
```bash
API_URL="your-api-url-here"

# Should redirect to Shopify OAuth
curl -v "$API_URL/auth?shop=test-store.myshopify.com"
```

Expected: HTTP 302 redirect to `test-store.myshopify.com/admin/oauth/authorize`

### Test 7: Frontend Deployment
```bash
# Check CloudFront distribution
FRONTEND_URL="your-frontend-url-here"

curl -I "$FRONTEND_URL"
```

Expected: HTTP 200 with `content-type: text/html`

### Test 8: Frontend Files in S3
```bash
BUCKET_NAME="your-bucket-name-here"

aws s3 ls s3://$BUCKET_NAME/
```

Expected: List of files including `index.html`, `assets/`

## OAuth Flow Tests

### Test 9: Complete OAuth Flow

1. **Start OAuth**:
   - Visit: `https://your-api-url/auth?shop=your-dev-store.myshopify.com`
   - Expected: Redirects to Shopify authorization page

2. **Approve permissions**:
   - Click "Install app"
   - Expected: Redirects to callback URL

3. **Callback processes**:
   - Expected: Redirects to frontend with `?shop=...&installed=true`

4. **Dashboard loads**:
   - Expected: Green "Installation successful!" banner

### Test 10: Parameter Store Verification
```bash
SHOP="your-dev-store.myshopify.com"

# Check access token exists
aws ssm get-parameter \
  --name "/shopify/clients/$SHOP/access-token" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text

# Check scopes
aws ssm get-parameter \
  --name "/shopify/clients/$SHOP/scopes" \
  --query 'Parameter.Value' \
  --output text

# Check installation timestamp
aws ssm get-parameter \
  --name "/shopify/clients/$SHOP/installed-at" \
  --query 'Parameter.Value' \
  --output text
```

Expected: All three parameters exist with valid values

### Test 11: Using Helper Scripts
```bash
SHOP="your-dev-store.myshopify.com"

# Get credentials
./scripts/get-credentials.sh $SHOP

# List all installations
./scripts/list-installations.sh
```

Expected: Credentials displayed, shop listed

## API Integration Tests

### Test 12: Node.js Client
```bash
cd utils
npm install

# Create test file
cat > test-client.js << 'EOF'
const ShopifyClient = require('./shopify-client');

async function test() {
  const shop = process.argv[2] || 'your-store.myshopify.com';
  const client = new ShopifyClient(shop);

  console.log(`Testing Shopify API for: ${shop}`);

  try {
    // Test getting access token
    const token = await client.getAccessToken();
    console.log('✅ Access token retrieved');
    console.log('Token preview:', token.substring(0, 20) + '...');

    // Test getting products
    const products = await client.getProducts(5);
    console.log(`✅ Retrieved ${products.products.length} products`);

    if (products.products.length > 0) {
      console.log('Sample product:', products.products[0].title);
    }

    // Test getting orders
    const orders = await client.getOrders(5);
    console.log(`✅ Retrieved ${orders.orders.length} orders`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

test();
EOF

# Run test
node test-client.js your-store.myshopify.com
```

Expected: All API calls succeed

### Test 13: Python Client
```bash
cd utils

# Install dependencies
pip3 install boto3 requests

# Create test file
cat > test_client.py << 'EOF'
import sys
from shopify_client import ShopifyClient

def test():
    shop = sys.argv[1] if len(sys.argv) > 1 else 'your-store.myshopify.com'
    client = ShopifyClient(shop)

    print(f'Testing Shopify API for: {shop}')

    try:
        # Test getting access token
        token = client.get_access_token()
        print('✅ Access token retrieved')
        print(f'Token preview: {token[:20]}...')

        # Test getting products
        products = client.get_products(limit=5)
        print(f"✅ Retrieved {len(products['products'])} products")

        if products['products']:
            print(f"Sample product: {products['products'][0]['title']}")

        # Test getting orders
        orders = client.get_orders(limit=5)
        print(f"✅ Retrieved {len(orders['orders'])} orders")

    except Exception as e:
        print(f'❌ Test failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    test()
EOF

# Run test
python3 test_client.py your-store.myshopify.com
```

Expected: All API calls succeed

### Test 14: GraphQL API
```bash
cd utils

cat > test-graphql.js << 'EOF'
const ShopifyClient = require('./shopify-client');

async function test() {
  const client = new ShopifyClient('your-store.myshopify.com');

  const query = `
    {
      shop {
        name
        email
        currencyCode
      }
      products(first: 3) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `;

  try {
    const data = await client.graphql(query);
    console.log('Shop:', data.shop.name);
    console.log('Products:', data.products.edges.length);
    console.log('✅ GraphQL test passed');
  } catch (error) {
    console.error('❌ GraphQL test failed:', error.message);
  }
}

test();
EOF

node test-graphql.js
```

Expected: Shop info and products retrieved via GraphQL

## Load Testing (Optional)

### Test 15: Lambda Performance
```bash
# Install artillery for load testing
npm install -g artillery

# Create load test config
cat > load-test.yml << 'EOF'
config:
  target: "https://your-api-url"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - flow:
      - get:
          url: "/auth?shop=test-store.myshopify.com"
EOF

# Run load test
artillery run load-test.yml
```

Expected: Low latency, no errors

## Security Tests

### Test 16: HMAC Verification
```bash
# Try to call callback without valid HMAC
API_URL="your-api-url"

curl "$API_URL/callback?shop=test.myshopify.com&code=fake&hmac=invalid"
```

Expected: HTTP 403 "Invalid HMAC signature"

### Test 17: Parameter Store Encryption
```bash
SHOP="your-store.myshopify.com"

# Check parameter is SecureString type
aws ssm describe-parameters \
  --filters "Key=Name,Values=/shopify/clients/$SHOP/access-token" \
  --query 'Parameters[0].Type' \
  --output text
```

Expected: `SecureString`

### Test 18: IAM Permissions
```bash
# Check Lambda role has minimal permissions
aws iam list-attached-role-policies \
  --role-name $(aws lambda get-function \
    --function-name ShopifyAppStack-CallbackFunction \
    --query 'Configuration.Role' \
    --output text | cut -d'/' -f2)
```

Expected: Only necessary policies attached (Lambda execution, SSM)

## Monitoring Tests

### Test 19: CloudWatch Logs
```bash
# Generate some requests
curl "https://your-api-url/auth?shop=test.myshopify.com"

# Check logs appear
aws logs tail /aws/lambda/ShopifyAppStack-AuthFunction --since 5m
```

Expected: Log entries showing the request

### Test 20: Lambda Metrics
```bash
# Get Lambda invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=ShopifyAppStack-AuthFunction \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum
```

Expected: Metrics showing invocations

## Automated Test Script

Create a comprehensive test script:

```bash
cat > run-tests.sh << 'EOF'
#!/bin/bash

set -e

echo "🧪 Running Shopify App Tests"
echo "=============================="

# Configuration
SHOP="${1:-test-store.myshopify.com}"
API_URL="${2:-}"
FRONTEND_URL="${3:-}"

if [ -z "$API_URL" ]; then
  echo "❌ Usage: $0 <shop-domain> <api-url> <frontend-url>"
  exit 1
fi

echo ""
echo "Configuration:"
echo "  Shop: $SHOP"
echo "  API URL: $API_URL"
echo "  Frontend URL: $FRONTEND_URL"
echo ""

# Test 1: API Health
echo "Test 1: API Health Check"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth")
if [ "$HTTP_CODE" -eq 400 ] || [ "$HTTP_CODE" -eq 302 ]; then
  echo "  ✅ API responding"
else
  echo "  ❌ API not responding (HTTP $HTTP_CODE)"
  exit 1
fi

# Test 2: Frontend Health
echo "Test 2: Frontend Health Check"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$HTTP_CODE" -eq 200 ]; then
  echo "  ✅ Frontend responding"
else
  echo "  ❌ Frontend not responding (HTTP $HTTP_CODE)"
  exit 1
fi

# Test 3: Parameter Store Access
echo "Test 3: Parameter Store Access"
if aws ssm describe-parameters --max-results 1 &>/dev/null; then
  echo "  ✅ Parameter Store accessible"
else
  echo "  ❌ Cannot access Parameter Store"
  exit 1
fi

# Test 4: Check if shop is installed
echo "Test 4: Check Installation"
if aws ssm get-parameter --name "/shopify/clients/$SHOP/access-token" --with-decryption &>/dev/null; then
  echo "  ✅ Shop $SHOP is installed"

  # Test 5: Retrieve credentials
  echo "Test 5: Retrieve Credentials"
  TOKEN=$(aws ssm get-parameter --name "/shopify/clients/$SHOP/access-token" --with-decryption --query 'Parameter.Value' --output text)
  if [ -n "$TOKEN" ]; then
    echo "  ✅ Credentials retrieved successfully"
  else
    echo "  ❌ Failed to retrieve credentials"
    exit 1
  fi

else
  echo "  ⚠️  Shop $SHOP not installed yet"
  echo "     Install the app on this shop to continue tests"
fi

echo ""
echo "✅ All tests passed!"
EOF

chmod +x run-tests.sh
```

Usage:
```bash
./run-tests.sh your-store.myshopify.com https://your-api-url https://your-frontend-url
```

## Test Results Checklist

Use this checklist to track your testing progress:

**Pre-Deployment**
- [ ] AWS access verified
- [ ] Node.js dependencies install
- [ ] Lambda functions have valid syntax

**Deployment**
- [ ] CDK synthesis succeeds
- [ ] CDK deploy completes
- [ ] All CloudFormation resources created

**Post-Deployment**
- [ ] API Gateway responds
- [ ] API redirects to Shopify OAuth
- [ ] Frontend serves HTML
- [ ] Frontend files in S3

**OAuth Flow**
- [ ] OAuth initiation works
- [ ] Shopify authorization page loads
- [ ] Callback processes successfully
- [ ] Dashboard displays correctly
- [ ] Success banner shows

**Parameter Store**
- [ ] Access token stored
- [ ] Scopes stored
- [ ] Installation timestamp stored
- [ ] Parameters encrypted (SecureString)

**API Integration**
- [ ] Node.js client retrieves credentials
- [ ] Node.js client fetches products
- [ ] Python client retrieves credentials
- [ ] Python client fetches products
- [ ] GraphQL queries work

**Security**
- [ ] HMAC validation blocks invalid requests
- [ ] Parameters encrypted
- [ ] IAM permissions minimal

**Monitoring**
- [ ] CloudWatch logs working
- [ ] Lambda metrics visible

## Troubleshooting Common Test Failures

### "Parameter not found"
- Shop not installed yet, or wrong shop name
- Check: `./scripts/list-installations.sh`

### "Access Denied" to Parameter Store
- AWS credentials issue
- Check: `aws sts get-caller-identity`

### API returns 500 error
- Check Lambda logs:
  ```bash
  aws logs tail /aws/lambda/ShopifyAppStack-CallbackFunction --follow
  ```

### Frontend shows white screen
- Check browser console
- Verify files deployed to S3
- Check CloudFront is serving files

### OAuth redirect fails
- Verify redirect URL in Shopify Partners exactly matches
- Check for trailing slashes
