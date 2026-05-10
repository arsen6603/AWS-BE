import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json',
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('importProductsFile called', { event });

  const fileName = event.queryStringParameters?.name;

  if (!fileName) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: 'Missing required query parameter: name' }),
    };
  }

  const client = new S3Client({ region: process.env.REGION });
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME!,
    Key: `uploaded/${fileName}`,
    ContentType: 'text/csv',
  });

  try {
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: signedUrl,
    };
  } catch (error) {
    console.error('importProductsFile error', error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
