import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const snsClient = new SNSClient({});

export async function handler(event: SQSEvent): Promise<void> {
  console.log('catalogBatchProcess called', { records: event.Records.length });

  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const { title, description, price, count } = body;

    if (!title || price == null || count == null) {
      console.error('Invalid product data, skipping', body);
      continue;
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

    console.log('Product created', { id, title });

    await snsClient.send(new PublishCommand({
      TopicArn: process.env.SNS_TOPIC_ARN,
      Subject: 'New product created',
      Message: JSON.stringify({ id, title, description: productDescription, price: productPrice, count: productCount }),
      MessageAttributes: {
        price: {
          DataType: 'Number',
          StringValue: String(productPrice),
        },
      },
    }));
  }
}
