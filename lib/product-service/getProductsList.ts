import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Content-Type': 'application/json',
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('getProductsList called', { event });

  try {
    const [productsResult, stockResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: process.env.PRODUCTS_TABLE_NAME })),
      docClient.send(new ScanCommand({ TableName: process.env.STOCK_TABLE_NAME })),
    ]);

    const products = productsResult.Items ?? [];
    const stocks = stockResult.Items ?? [];

    const stockMap = Object.fromEntries(stocks.map((s) => [s.product_id as string, s.count as number]));

    const result = products.map((product) => ({
      ...product,
      count: stockMap[product.id as string] ?? 0,
    }));

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
  } catch (error) {
    console.error('getProductsList error', error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: 'Internal server error' }) };
  }
}
