import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as fs from 'fs';
import { Construct } from 'constructs';

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizerFn: lambdaNode.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const envVars = loadEnvFile(path.join(__dirname, '.env'));

    this.basicAuthorizerFn = new lambdaNode.NodejsFunction(this, 'basicAuthorizer', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, './basicAuthorizer.ts'),
      handler: 'handler',
      environment: envVars,
      bundling: { externalModules: ['@aws-sdk/*'] },
    });
  }
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const result: Record<string, string> = {};
  fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        result[trimmed.substring(0, eqIndex).trim()] = trimmed.substring(eqIndex + 1).trim();
      }
    });
  return result;
}
