import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION ?? 'eu-west-1';
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const products = [
  {
    id: '19ba3d6a-f8ed-491b-a192-0a33b71b38c4',
    title: 'iPhone 15 Pro',
    description: 'Latest Apple flagship smartphone with titanium design',
    price: 999,
  },
  {
    id: 'a3f8c2d1-1234-5678-abcd-ef0123456789',
    title: 'Samsung Galaxy S24',
    description: 'Samsung flagship with Galaxy AI features',
    price: 899,
  },
  {
    id: 'b7e9d4c2-2345-6789-bcde-f01234567890',
    title: 'MacBook Pro 14"',
    description: 'Apple M3 Pro chip laptop for professionals',
    price: 1999,
  },
  {
    id: 'c1f0e5d3-3456-789a-cdef-012345678901',
    title: 'Sony WH-1000XM5',
    description: 'Industry-leading noise-cancelling headphones',
    price: 349,
  },
  {
    id: 'd4a2b6e8-4567-89ab-def0-123456789012',
    title: 'iPad Air M2',
    description: 'Powerful and portable tablet with M2 chip',
    price: 599,
  },
];

const stocks = [
  { product_id: '19ba3d6a-f8ed-491b-a192-0a33b71b38c4', count: 50 },
  { product_id: 'a3f8c2d1-1234-5678-abcd-ef0123456789', count: 30 },
  { product_id: 'b7e9d4c2-2345-6789-bcde-f01234567890', count: 20 },
  { product_id: 'c1f0e5d3-3456-789a-cdef-012345678901', count: 100 },
  { product_id: 'd4a2b6e8-4567-89ab-def0-123456789012', count: 40 },
];

async function fillTables(): Promise<void> {
  console.log(`Filling tables in region: ${REGION}`);

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        products: products.map((item) => ({ PutRequest: { Item: item } })),
      },
    }),
  );
  console.log(`✅ Products table filled with ${products.length} items`);

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        stock: stocks.map((item) => ({ PutRequest: { Item: item } })),
      },
    }),
  );
  console.log(`Stock table filled with ${stocks.length} items`);
}

fillTables().catch((err) => {
  console.error('Failed to fill tables:', err);
  process.exit(1);
});
