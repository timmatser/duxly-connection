#!/bin/bash

# Script to retrieve Shopify credentials from Parameter Store
# Usage: ./scripts/get-credentials.sh shop-name.myshopify.com

if [ -z "$1" ]; then
  echo "Usage: $0 <shop-domain>"
  echo "Example: $0 my-store.myshopify.com"
  exit 1
fi

SHOP=$1
PREFIX="/shopify/clients"

echo "🔍 Retrieving credentials for: $SHOP"
echo ""

# Get access token
echo "Access Token:"
aws ssm get-parameter \
  --name "$PREFIX/$SHOP/access-token" \
  --with-decryption \
  --query 'Parameter.Value' \
  --output text 2>/dev/null

if [ $? -ne 0 ]; then
  echo "❌ No credentials found for $SHOP"
  exit 1
fi

echo ""

# Get scopes
echo "Scopes:"
aws ssm get-parameter \
  --name "$PREFIX/$SHOP/scopes" \
  --query 'Parameter.Value' \
  --output text 2>/dev/null

echo ""

# Get installation timestamp
echo "Installed at:"
aws ssm get-parameter \
  --name "$PREFIX/$SHOP/installed-at" \
  --query 'Parameter.Value' \
  --output text 2>/dev/null

echo ""
echo "✅ Credentials retrieved successfully"
