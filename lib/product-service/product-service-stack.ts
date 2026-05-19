import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(this, 'ProductsTable', 'products');
    const stockTable = dynamodb.Table.fromTableName(this, 'StockTable', 'stock');

    const environment = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCK_TABLE_NAME: stockTable.tableName,
    };

    const bundling = { externalModules: ['@aws-sdk/*'] };

    // SQS queue for catalog items
    this.catalogItemsQueue = new sqs.Queue(this, 'catalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(180),
    });

    // SNS topic for product creation notifications
    const createProductTopic = new sns.Topic(this, 'createProductTopic', {
      topicName: 'createProductTopic',
    });

    // Primary email subscription - all products
    createProductTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('arsen.janybekov03@gmail.com'),
    );

    // Additional subscription with filter policy for high-value products (price >= 100)
    new sns.Subscription(this, 'HighValueProductSubscription', {
      topic: createProductTopic,
      protocol: sns.SubscriptionProtocol.EMAIL,
      endpoint: 'arsen.janybekov03@gmail.com',
      filterPolicy: {
        price: sns.SubscriptionFilter.numericFilter({ greaterThanOrEqualTo: 100 }),
      },
    });

    const getProductsList = new lambdaNode.NodejsFunction(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, './getProductsList.ts'),
      handler: 'handler',
      environment,
      bundling,
    });

    const getProductsById = new lambdaNode.NodejsFunction(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, './getProductsById.ts'),
      handler: 'handler',
      environment,
      bundling,
    });

    const createProduct = new lambdaNode.NodejsFunction(this, 'createProduct', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, './createProduct.ts'),
      handler: 'handler',
      environment,
      bundling,
    });

    const catalogBatchProcess = new lambdaNode.NodejsFunction(this, 'catalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(__dirname, './catalogBatchProcess.ts'),
      handler: 'handler',
      environment: {
        ...environment,
        SNS_TOPIC_ARN: createProductTopic.topicArn,
      },
      bundling,
    });

    // SQS event source with batchSize 5
    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(this.catalogItemsQueue, { batchSize: 5 }),
    );

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

    productsTable.grantWriteData(catalogBatchProcess);
    stockTable.grantWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    const api = new apigateway.RestApi(this, 'products-api', {
      restApiName: 'Product Service API',
      description: 'API for Product Service lambdas.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource('products');
    productsResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));
    productsResource.addMethod('POST', new apigateway.LambdaIntegration(createProduct));

    const productByIdResource = productsResource.addResource('{productId}');
    productByIdResource.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'Product Service API Gateway URL',
    });

    new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
      value: this.catalogItemsQueue.queueUrl,
      description: 'SQS Queue URL for catalog items',
    });

    new cdk.CfnOutput(this, 'CreateProductTopicArn', {
      value: createProductTopic.topicArn,
      description: 'SNS Topic ARN for product creation',
    });
  }
}
