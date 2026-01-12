#!/bin/bash
# Deploy Duxly Connection Admin UI to S3

set -e

S3_BUCKET="duxly-internal"
S3_PATH="duxly-connection-admin"
REGION="eu-central-1"
CLOUDFRONT_STACK_NAME="duxly-connection-admin-cloudfront"

echo "=========================================="
echo "Deploying Duxly Connection Admin UI"
echo "=========================================="
echo ""

echo "Uploading files to S3..."
aws s3 sync . s3://${S3_BUCKET}/${S3_PATH}/ \
    --exclude "*.sh" \
    --exclude ".DS_Store" \
    --exclude "infrastructure/*" \
    --cache-control "max-age=3600"

echo ""
echo "=========================================="
echo "S3 Upload complete!"
echo "=========================================="
echo ""

# Invalidate CloudFront cache
echo "Invalidating CloudFront cache..."
CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name $CLOUDFRONT_STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]; then
    aws cloudfront create-invalidation \
        --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text
    echo "CloudFront invalidation created"
    echo ""
    echo "Dashboard URL:"
    echo "https://connection-admin.duxly.eu"
else
    echo "CloudFront distribution not found, skipping invalidation"
    echo ""
    echo "Dashboard URL:"
    echo "https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${S3_PATH}/index.html"
fi
echo ""
