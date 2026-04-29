import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('getProductsById called', { event });

  const productId = event.pathParameters?.productId;

  if (!productId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: 'Product ID is required' }) };
  }

  try {
    const [productResult, stockResult] = await Promise.all([
      docClient.send(new GetCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: { id: productId },
      })),
      docClient.send(new GetCommand({
        TableName: process.env.STOCK_TABLE_NAME,
        Key: { product_id: productId },
      })),
    ]);

    if (!productResult.Item) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: 'Product not found' }) };
    }

    const result = {
      ...productResult.Item,
      count: stockResult.Item?.count ?? 0,
    };

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
  } catch (error) {
    console.error('getProductsById error', error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
}
