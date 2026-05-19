#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { ProductServiceStack } from '../lib/product-service/product-service-stack';
import { ImportServiceStack } from '../lib/import-service/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service/authorization-service-stack';

const app = new cdk.App();

const productServiceStack = new ProductServiceStack(app, 'ProductServiceStack', {
  env: { region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
});

const authorizationServiceStack = new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {
  env: { region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
});

new ImportServiceStack(app, 'ImportServiceStack', {
  env: { region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1' },
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
  basicAuthorizerFn: authorizationServiceStack.basicAuthorizerFn,
});
