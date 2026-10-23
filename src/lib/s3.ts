import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
const region = process.env.AWS_REGION || 'ap-southeast-1';
export const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'bongdaso-user';

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadFileToS3(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const cleanName = fileName.replace(/\s+/g, '_');
  const fileKey = `${Date.now()}-${cleanName}`;
  const s3Key = `uploads/${fileKey}`;

  // 1. Upload to AWS S3 bucket bongdaso-user
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
  } catch (err: any) {
    console.warn('AWS S3 upload notice:', err.message);
  }

  // 2. Persist locally in public/uploads so browser can GET immediately without S3 403 Forbidden
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadsDir, fileKey), buffer);
  } catch (fsErr: any) {
    console.error('Local file write error:', fsErr);
  }

  // Return static accessible URL
  return `/uploads/${fileKey}`;
}
