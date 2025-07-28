export const REDIS_PASS = 'REDIS_PASS';
export const REDIS_HOST = 'REDIS_HOST';
export const REDIS_PORT = 'REDIS_PORT';

export const MAIL_FROM = 'MAIL_FROM';
export const MAIL_HOST = 'MAIL_HOST';
export const MAIL_PASSWORD = 'MAIL_PASSWORD';
export const MAIL_PORT = 'MAIL_PORT';
export const MAIL_USER = 'MAIL_USER';

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@example.com';
export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
export const SITE_NAME = process.env.SITE_NAME || 'ASFAAR API';
export const APP_NAME = process.env.APP_NAME || 'ASFAAR';
export const API_VERSION = process.env.API_VERSION || 'v1';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 3000;
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const JWT_SECRET = process.env.JWT_SECRET || 'secret';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const AWS_S3_REGION = 'AWS_S3_REGION';
export const AWS_S3_BUCKET = 'AWS_S3_BUCKET';
export const AWS_ACCESS_KEY_ID = 'AWS_ACCESS_KEY_ID';
export const AWS_SECRET_ACCESS_KEY = 'AWS_SECRET_ACCESS_KEY';
export const AWS_S3_ENDPOINT = 'AWS_S3_ENDPOINT';

export const UPLOAD_RATE_TTL = 'THROTTLE_TTL';
export const UPLOAD_RATE_LIMIT = 'THROTTLE_LIMIT';

export const CLIENT_URL = 'CLIENT_URL';

export const ELASTICSEARCH_URL = 'ELASTICSEARCH_URL';
