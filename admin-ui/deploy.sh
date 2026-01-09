#!/bin/bash
# Deploy Duxly Connection Admin UI to S3

S3_BUCKET="duxly-internal"
S3_PATH="duxly-connection-admin"

echo "Deploying admin UI to s3://${S3_BUCKET}/${S3_PATH}/"

aws s3 sync . s3://${S3_BUCKET}/${S3_PATH}/ \
    --exclude "*.sh" \
    --exclude ".DS_Store" \
    --cache-control "max-age=3600"

echo "Done! Access at: https://${S3_BUCKET}.s3.eu-central-1.amazonaws.com/${S3_PATH}/index.html"
