import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(this, 'ProductsTable', 'products');
    const stockTable = dynamodb.Table.fromTableName(this, 'StockTable', 'stock');

    const environment = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCK_TABLE_NAME: stockTable.tableName,
    };

    const bundling = { externalModules: ['@aws-sdk/*'] };

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

    productsTable.grantReadData(getProductsList);
    stockTable.grantReadData(getProductsList);

    productsTable.grantReadData(getProductsById);
    stockTable.grantReadData(getProductsById);

    productsTable.grantWriteData(createProduct);
    stockTable.grantWriteData(createProduct);

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
  }
}
