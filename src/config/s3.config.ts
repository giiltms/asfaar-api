import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  endpoint:
    process.env.AWS_S3_ENDPOINT ||
    `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`,
  region: process.env.AWS_S3_REGION || 'us-east-1',
  bucket: {
    avatar: process.env.S3_AVATAR_BUCKET,
  },
}));
