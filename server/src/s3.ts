/**
 * S3 client and upload helpers
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from './env';
import { logger } from './utils/logger';

export const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
});

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType?: string
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      Body: typeof body === 'string' ? Buffer.from(body) : body,
      ContentType: contentType || 'application/octet-stream',
    });

    await s3Client.send(command);

    // Construct S3 URL
    const s3Url = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;

    logger.info({ key, size: body.length }, 'Uploaded to S3');

    return s3Url;
  } catch (error) {
    logger.error({ error, key }, 'Failed to upload to S3');
    throw new Error('S3 upload failed');
  }
}

/**
 * Upload a large file to S3 using multipart upload
 */
export async function uploadLargeFile(
  key: string,
  body: Buffer,
  contentType?: string
): Promise<string> {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType || 'application/octet-stream',
      },
    });

    await upload.done();

    const s3Url = `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;

    logger.info({ key, size: body.length }, 'Uploaded large file to S3');

    return s3Url;
  } catch (error) {
    logger.error({ error, key }, 'Failed to upload large file to S3');
    throw new Error('S3 multipart upload failed');
  }
}

/**
 * Get a file from S3
 */
export async function getFromS3(key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    logger.error({ error, key }, 'Failed to get from S3');
    throw new Error('S3 download failed');
  }
}
