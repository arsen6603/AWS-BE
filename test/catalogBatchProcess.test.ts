import { SQSEvent } from 'aws-lambda';

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: jest.fn().mockResolvedValue({}) }),
  },
  TransactWriteCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: jest.fn().mockResolvedValue({}) })),
  PublishCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

import { DynamoDBDocumentClient, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { handler } from '../lib/product-service/catalogBatchProcess';

const getDocSend = () =>
  (DynamoDBDocumentClient.from as jest.Mock).mock.results[0].value.send as jest.Mock;
const getSnsSend = () =>
  (SNSClient as jest.Mock).mock.results[0].value.send as jest.Mock;

function makeSqsEvent(bodies: object[]): SQSEvent {
  return {
    Records: bodies.map((body, i) => ({
      messageId: `msg-${i}`,
      receiptHandle: `receipt-${i}`,
      body: JSON.stringify(body),
      attributes: {
        ApproximateReceiveCount: '1',
        SentTimestamp: '0',
        SenderId: 'test',
        ApproximateFirstReceiveTimestamp: '0',
      },
      messageAttributes: {},
      md5OfBody: '',
      eventSource: 'aws:sqs',
      eventSourceARN: 'arn:aws:sqs:us-east-1:123:catalogItemsQueue',
      awsRegion: 'us-east-1',
    })),
  };
}

describe('catalogBatchProcess', () => {
  beforeEach(() => {
    process.env.PRODUCTS_TABLE_NAME = 'products';
    process.env.STOCK_TABLE_NAME = 'stock';
    process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123:createProductTopic';

    getDocSend().mockClear().mockResolvedValue({});
    getSnsSend().mockClear().mockResolvedValue({});
    (TransactWriteCommand as unknown as jest.Mock).mockClear();
    (PublishCommand as unknown as jest.Mock).mockClear();
  });

  test('creates a product in DynamoDB for each valid SQS record', async () => {
    const event = makeSqsEvent([
      { title: 'Laptop', description: 'A laptop', price: 999, count: 5 },
      { title: 'Mouse', price: 29, count: 10 },
    ]);

    await handler(event);

    expect(getDocSend()).toHaveBeenCalledTimes(2);
    expect(getSnsSend()).toHaveBeenCalledTimes(2);
  });

  test('skips records missing required fields', async () => {
    const event = makeSqsEvent([
      { description: 'no title', price: 10, count: 5 },
      { title: 'Valid', price: 20, count: 3 },
    ]);

    await handler(event);

    expect(getDocSend()).toHaveBeenCalledTimes(1);
    expect(getSnsSend()).toHaveBeenCalledTimes(1);
  });

  test('TransactWriteCommand writes to both products and stock tables', async () => {
    const event = makeSqsEvent([{ title: 'Headphones', price: 149, count: 20 }]);

    await handler(event);

    expect(TransactWriteCommand as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        TransactItems: expect.arrayContaining([
          expect.objectContaining({
            Put: expect.objectContaining({ TableName: 'products' }),
          }),
          expect.objectContaining({
            Put: expect.objectContaining({ TableName: 'stock' }),
          }),
        ]),
      }),
    );
  });

  test('publishes to SNS with price as MessageAttribute', async () => {
    const event = makeSqsEvent([{ title: 'Tablet', price: 499, count: 8 }]);

    await handler(event);

    expect(PublishCommand as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        TopicArn: 'arn:aws:sns:us-east-1:123:createProductTopic',
        MessageAttributes: {
          price: { DataType: 'Number', StringValue: '499' },
        },
      }),
    );
  });

  test('uses empty string as default description when not provided', async () => {
    const event = makeSqsEvent([{ title: 'Widget', price: 5, count: 1 }]);

    await handler(event);

    expect(TransactWriteCommand as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        TransactItems: expect.arrayContaining([
          expect.objectContaining({
            Put: expect.objectContaining({
              Item: expect.objectContaining({ description: '' }),
            }),
          }),
        ]),
      }),
    );
  });
});
