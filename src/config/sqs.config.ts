import { registerAs } from '@nestjs/config';
import * as process from 'process';

export default registerAs('sqs', () => ({
  consumer: {
    queues: {
      aggregate: process.env.AWS_SQS_QUEUE_NAME || 'example-queue',
      aggregateQueueUrl: process.env.AWS_SQS_QUEUE_URL || '',
    },
    region: process.env.AWS_SQS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID || '',
      secretAccessKey:
        process.env.AWS_SQS_SECRET_ACCESS_KEY ||
        '',
    },
  },
  producer: {
    queues: {
      aggregate: process.env.AWS_SQS_QUEUE_NAME || 'example-queue',
      aggregateQueueUrl: process.env.AWS_SQS_QUEUE_URL || '',
    },
    queueUrl: process.env.AWS_SQS_QUEUE_URL || '',
    region: process.env.AWS_SQS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_SQS_ACCESS_KEY_ID || '',
      secretAccessKey:
        process.env.AWS_SQS_SECRET_ACCESS_KEY ||
        '',
    },
  },
}));
