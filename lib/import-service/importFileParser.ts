import { S3Event } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';
import csv = require('csv-parser');

const s3Client = new S3Client({ region: process.env.REGION });
const sqsClient = new SQSClient({ region: process.env.REGION });

export async function handler(event: S3Event): Promise<void> {
  console.log('importFileParser called', { event });

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name;
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing: s3://${bucketName}/${objectKey}`);
    await parseAndMoveFile(bucketName, objectKey);
  }
}

async function parseAndMoveFile(bucketName: string, objectKey: string): Promise<void> {
  const response = await s3Client.send(
    new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
  );

  const records: Record<string, unknown>[] = [];

  await new Promise<void>((resolve, reject) => {
    (response.Body as Readable)
      .pipe(csv())
      .on('data', (data: Record<string, unknown>) => {
        records.push(data);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  await Promise.all(
    records.map((record) =>
      sqsClient.send(
        new SendMessageCommand({
          QueueUrl: process.env.CATALOG_ITEMS_QUEUE_URL,
          MessageBody: JSON.stringify(record),
        }),
      ),
    ),
  );

  console.log(`Sent ${records.length} records to SQS`);

  const parsedKey = objectKey.replace('uploaded/', 'parsed/');

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${objectKey}`,
      Key: parsedKey,
    }),
  );

  await s3Client.send(
    new DeleteObjectCommand({ Bucket: bucketName, Key: objectKey }),
  );

  console.log(`Moved s3://${bucketName}/${objectKey} → s3://${bucketName}/${parsedKey}`);
}
