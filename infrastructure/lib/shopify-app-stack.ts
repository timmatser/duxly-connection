import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

export class ShopifyAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Environment variables from context or defaults
    // Note: SHOPIFY_API_KEY/SECRET removed - now loaded dynamically from Parameter Store per app
    const parameterStorePrefix = process.env.PARAMETER_STORE_PREFIX || '/shopify/duxly-connection';

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

    // CloudFront distribution for the frontend
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
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
    });

    // DynamoDB table for caching store statistics
    const statsCacheTable = new dynamodb.Table(this, 'StatsCacheTable', {
      tableName: 'shopify-stats-cache',
      partitionKey: { name: 'shop', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Lambda function for OAuth installation
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions')),
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda function for OAuth callback
    const callbackFunction = new lambda.Function(this, 'CallbackFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'callback.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions')),
      environment: {
        FRONTEND_URL: `https://${distribution.distributionDomainName}`,
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda function for app proxy requests (optional)
    const proxyFunction = new lambda.Function(this, 'ProxyFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'proxy.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions')),
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda function for fetching store statistics
    const statsFunction = new lambda.Function(this, 'StatsFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'stats.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions')),
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
        STATS_CACHE_TABLE: statsCacheTable.tableName,
        CACHE_TTL_SECONDS: '3600', // 1 hour cache
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda function for disconnecting a store
    const disconnectFunction = new lambda.Function(this, 'DisconnectFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'disconnect.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../backend/functions')),
      environment: {
        PARAMETER_STORE_PREFIX: parameterStorePrefix,
        STATS_CACHE_TABLE: statsCacheTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant DynamoDB permissions to stats function
    statsCacheTable.grantReadWriteData(statsFunction);

    // Grant DynamoDB permissions to disconnect function (for cache cleanup)
    statsCacheTable.grantReadWriteData(disconnectFunction);

    // Grant Parameter Store permissions to Lambda functions
    // Includes GetParametersByPath for multi-app credential loading
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

    // API Gateway
    const api = new apigateway.RestApi(this, 'ShopifyApi', {
      restApiName: 'Shopify App API',
      description: 'API for Shopify app OAuth and webhooks',
      deployOptions: {
        stageName: 'prod',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // API Routes
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

    // Add APP_URL to Lambda functions after API Gateway is created
    // This resolves the circular dependency issue - api.url is a CloudFormation token
    authFunction.addEnvironment('APP_URL', api.url);
    callbackFunction.addEnvironment('APP_URL', api.url);

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 Bucket for frontend',
    });
  }
}
