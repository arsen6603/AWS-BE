import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new lambda.Function(this, 'getProductsList', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsList.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    const getProductsById = new lambda.Function(this, 'getProductsById', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: 'getProductsById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, './')),
    });

    const api = new apigateway.RestApi(this, 'products-api', {
      restApiName: 'Product Service API',
      description: 'API for Product Service lambdas.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const productsResource = api.root.addResource('products');

    productsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsList),
    );

    const productByIdResource = productsResource.addResource('{productId}');

    productByIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getProductsById),
    );
  }
}
