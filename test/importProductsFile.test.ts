import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

import { handler } from '../lib/import-service/importProductsFile';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('importProductsFile', () => {
  beforeEach(() => {
    process.env.BUCKET_NAME = 'test-bucket';
    process.env.REGION = 'us-east-1';
    mockGetSignedUrl.mockClear();
  });

  test('returns 400 when name query parameter is missing', async () => {
    const event = { queryStringParameters: null } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toHaveProperty('message');
  });

  test('returns 400 when queryStringParameters is empty object', async () => {
    const event = { queryStringParameters: {} } as unknown as APIGatewayProxyEvent;
    const result = await handler(event);

    expect(result.statusCode).toBe(400);
  });

  test('returns signed URL when name parameter is provided', async () => {
    const signedUrl =
      'https://s3.amazonaws.com/test-bucket/uploaded/products.csv?X-Amz-Signature=abc';
    mockGetSignedUrl.mockResolvedValueOnce(signedUrl);

    const event = {
      queryStringParameters: { name: 'products.csv' },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(signedUrl);
  });

  test('uses correct S3 key pattern uploaded/${name}', async () => {
    mockGetSignedUrl.mockResolvedValueOnce('https://signed-url');

    const event = {
      queryStringParameters: { name: 'test.csv' },
    } as unknown as APIGatewayProxyEvent;

    await handler(event);

    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    const [, command] = mockGetSignedUrl.mock.calls[0];
    expect(command).toMatchObject({ Key: 'uploaded/test.csv', Bucket: 'test-bucket' });
  });

  test('returns 500 on S3 error', async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error('S3 error'));

    const event = {
      queryStringParameters: { name: 'products.csv' },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toHaveProperty('message');
  });
});
