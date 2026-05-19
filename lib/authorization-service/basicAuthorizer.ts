import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from 'aws-lambda';

export async function handler(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
  console.log('basicAuthorizer called', { methodArn: event.methodArn });

  const token = event.authorizationToken;

  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const base64Credentials = token.replace(/^Basic\s+/i, '');
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');

    if (colonIndex === -1) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    const username = decoded.substring(0, colonIndex);
    const password = decoded.substring(colonIndex + 1);
    const storedPassword = process.env[username];

    if (!storedPassword || storedPassword !== password) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    return generatePolicy(username, 'Allow', event.methodArn);
  } catch (error) {
    throw new Error('Unauthorized');
  }
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
