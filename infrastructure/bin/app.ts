#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ShopifyAppStack } from '../lib/shopify-app-stack';

const app = new cdk.App();

new ShopifyAppStack(app, 'ShopifyAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
  },
  description: 'Shopify App Template with OAuth and Parameter Store integration',
});

app.synth();
