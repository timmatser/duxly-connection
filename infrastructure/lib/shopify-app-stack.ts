import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';

// Custom domain configuration for connections.duxly.eu
const CUSTOM_DOMAIN = 'connections.duxly.eu';
// ACM certificate ARN in us-east-1 (required for CloudFront)
const ACM_CERTIFICATE_ARN = 'arn:aws:acm:us-east-1:287364126144:certificate/da3e1ab6-27b7-4c44-abca-5fe3f805fd5c';

export class ShopifyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment variables from context or defaults
    const parameterStorePrefix = process.env.PARAMETER_STORE_PREFIX || '/shopify/duxly-connection';

    // ==================== S3 & CloudFront ====================

    // S3 bucket for hosting the frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Import ACM certificate for custom domain (must be in us-east-1 for CloudFront)
    const certificate = acm.Certificate.fromCertificateArn(
      this, 'Certificate', ACM_CERTIFICATE_ARN
    );

    // CloudFront distribution for the frontend with custom domain
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      domainNames: [CUSTOM_DOMAIN],
      certificate: certificate,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // ==================== DynamoDB ====================

    // DynamoDB table for caching store statistics
    const statsCacheTable = new dynamodb.Table(this, 'StatsCacheTable', {
      tableName: 'shopify-stats-cache',
      partitionKey: { name: 'shop', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // ==================== Lambda Functions ====================

    // Shared Lambda code asset
    const lambdaCode = lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions'));

    // Lambda function for OAuth installation
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth.handler',
      code: lambdaCode,
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for OAuth callback
    const callbackFunction = new lambda.Function(this, 'CallbackFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'callback.handler',
      code: lambdaCode,
      environment: {
        FRONTEND_URL: `https://${CUSTOM_DOMAIN}`,
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for app proxy requests
    const proxyFunction = new lambda.Function(this, 'ProxyFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'proxy.handler',
      code: lambdaCode,
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for fetching store statistics
    const statsFunction = new lambda.Function(this, 'StatsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'stats.handler',
      code: lambdaCode,
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
        STATS_CACHE_TABLE: statsCacheTable.tableName,
        CACHE_TTL_SECONDS: '3600',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for disconnecting a store
    const disconnectFunction = new lambda.Function(this, 'DisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'disconnect.handler',
      code: lambdaCode,
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
        STATS_CACHE_TABLE: statsCacheTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Lambda function for GDPR compliance webhooks
    const gdprFunction = new lambda.Function(this, 'GdprFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'gdpr.handler',
      code: lambdaCode,
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // ==================== Permissions ====================

    // Grant DynamoDB permissions
    statsCacheTable.grantReadWriteData(statsFunction);
    statsCacheTable.grantReadWriteData(disconnectFunction);

    // Grant Parameter Store permissions to Lambda functions
    const parameterStorePolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ssm:PutParameter',
        'ssm:GetParameter',
        'ssm:GetParameters',
        'ssm:GetParametersByPath',
        'ssm:DeleteParameter',
      ],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter${parameterStorePrefix}/*`,
      ],
    });

    authFunction.addToRolePolicy(parameterStorePolicy);
    callbackFunction.addToRolePolicy(parameterStorePolicy);
    proxyFunction.addToRolePolicy(parameterStorePolicy);
    statsFunction.addToRolePolicy(parameterStorePolicy);
    disconnectFunction.addToRolePolicy(parameterStorePolicy);
    gdprFunction.addToRolePolicy(parameterStorePolicy);

    // ==================== API Gateway ====================

    const api = new apigateway.RestApi(this, 'ShopifyApi', {
      restApiName: 'Duxly Connection API',
      description: 'API for Duxly Connection Shopify app',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Main API Routes
    const auth = api.root.addResource('auth');
    auth.addMethod('GET', new apigateway.LambdaIntegration(authFunction));

    const callback = api.root.addResource('callback');
    callback.addMethod('GET', new apigateway.LambdaIntegration(callbackFunction));

    const proxy = api.root.addResource('proxy');
    proxy.addMethod('POST', new apigateway.LambdaIntegration(proxyFunction));

    const stats = api.root.addResource('stats');
    stats.addMethod('GET', new apigateway.LambdaIntegration(statsFunction));

    const disconnect = api.root.addResource('disconnect');
    disconnect.addMethod('POST', new apigateway.LambdaIntegration(disconnectFunction));

    // GDPR Webhook Routes
    const webhooks = api.root.addResource('webhooks');
    const gdpr = webhooks.addResource('gdpr');

    const customersDataRequest = gdpr.addResource('customers_data_request');
    customersDataRequest.addMethod('POST', new apigateway.LambdaIntegration(gdprFunction));

    const customersRedact = gdpr.addResource('customers_redact');
    customersRedact.addMethod('POST', new apigateway.LambdaIntegration(gdprFunction));

    const shopRedact = gdpr.addResource('shop_redact');
    shopRedact.addMethod('POST', new apigateway.LambdaIntegration(gdprFunction));

    // Add APP_URL environment variable (constructed to avoid circular dependency)
    const apiUrl = `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod/`;
    authFunction.addEnvironment('APP_URL', apiUrl);
    callbackFunction.addEnvironment('APP_URL', apiUrl);

    // ==================== Outputs ====================

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${CUSTOM_DOMAIN}`,
      description: 'Custom Domain URL',
    });

    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL (update DNS to point to this)',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket for frontend deployment',
    });

    new cdk.CfnOutput(this, 'GdprWebhookUrls', {
      value: [
        `customers/data_request: ${api.url}webhooks/gdpr/customers_data_request`,
        `customers/redact: ${api.url}webhooks/gdpr/customers_redact`,
        `shop/redact: ${api.url}webhooks/gdpr/shop_redact`,
      ].join('\n'),
      description: 'GDPR Webhook URLs for Shopify Partner Dashboard',
    });
  }
}
