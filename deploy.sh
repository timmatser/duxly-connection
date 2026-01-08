#!/bin/bash

# Deployment script for Shopify App Template
set -e

echo "🚀 Starting deployment..."

# Check if environment variables are set
if [ -z "$SHOPIFY_API_KEY" ] || [ -z "$SHOPIFY_API_SECRET" ]; then
  echo "❌ Error: SHOPIFY_API_KEY and SHOPIFY_API_SECRET must be set"
  echo "Please set them in your environment or .env file"
  exit 1
fi

# Install dependencies
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "📦 Installing infrastructure dependencies..."
cd infrastructure && npm install && cd ..

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Build frontend
echo "🏗️  Building frontend..."
cd frontend && npm run build && cd ..

# Deploy infrastructure with CDK
echo "☁️  Deploying infrastructure..."
cd infrastructure

# Bootstrap CDK if needed (only needed once per account/region)
# npm run cdk bootstrap

# Deploy the stack
npm run deploy

# Get outputs
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Note the API URL and Frontend URL from the CDK outputs above"
echo "2. Update your .env file with these URLs"
echo "3. In Shopify Partners, create a new app with:"
echo "   - App URL: [Frontend URL]"
echo "   - Allowed redirection URL(s): [API URL]/callback"
echo "4. Deploy the frontend to S3:"
echo "   aws s3 sync frontend/dist s3://[FrontendBucketName] --delete"
echo ""

cd ..
