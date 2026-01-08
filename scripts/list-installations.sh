#!/bin/bash

# Script to list all Shopify installations
# Usage: ./scripts/list-installations.sh

PREFIX="/shopify/clients"

echo "📋 Listing all Shopify installations..."
echo ""

# Get all parameters under the prefix
aws ssm get-parameters-by-path \
  --path "$PREFIX" \
  --recursive \
  --query 'Parameters[?contains(Name, `access-token`)].Name' \
  --output text \
  | sed "s|$PREFIX/||g" \
  | sed 's|/access-token||g' \
  | sort

echo ""
echo "✅ Done"
