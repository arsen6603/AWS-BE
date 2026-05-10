import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3notifications from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, 'ImportBucket', {
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const environment = {
      BUCKET_NAME: importBucket.bucketName,
      REGION: this.region,
    };

    const importProductsFileFn = new lambdaNode.NodejsFunction(this, 'importProductsFile', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, './importProductsFile.ts'),
      handler: 'handler',
      environment,
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    importBucket.grantPut(importProductsFileFn);

    const importFileParserFn = new lambdaNode.NodejsFunction(this, 'importFileParser', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      entry: path.join(__dirname, './importFileParser.ts'),
      handler: 'handler',
      environment,
      bundling: { externalModules: ['@aws-sdk/*'] },
    });

    importBucket.grantReadWrite(importFileParserFn);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3notifications.LambdaDestination(importFileParserFn),
      { prefix: 'uploaded/' },
    );

    const api = new apigateway.RestApi(this, 'import-api', {
      restApiName: 'Import Service API',
      description: 'API for Import Service lambdas.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileFn), {
      requestParameters: { 'method.request.querystring.name': true },
    });

    new cdk.CfnOutput(this, 'ImportApiUrl', {
      value: api.url,
      description: 'Import Service API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ImportBucketName', {
      value: importBucket.bucketName,
      description: 'Import S3 Bucket Name',
    });
  }
}
