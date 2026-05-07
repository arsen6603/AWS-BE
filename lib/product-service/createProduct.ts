import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('createProduct called', { event });

  try {
    const body = JSON.parse(event.body ?? '{}');
    const { title, description, price, count } = body;

    if (!title || price == null || Number(price) < 0 || count == null || Number(count) < 0) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: 'Invalid product data: title, price and count are required and must be non-negative' }),
      };
    }

    const id = randomUUID();
    const productPrice = Number(price);
    const productCount = Number(count);
    const productDescription = description ?? '';

    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE_NAME,
            Item: { id, title, description: productDescription, price: productPrice },
          },
        },
        {
          Put: {
            TableName: process.env.STOCK_TABLE_NAME,
            Item: { product_id: id, count: productCount },
          },
        },
      ],
    }));

    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify({ id, title, description: productDescription, price: productPrice, count: productCount }),
    };
  } catch (error) {
    console.error('createProduct error', error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
}
