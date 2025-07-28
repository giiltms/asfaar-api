export const USER_NOT_FOUND = '404001: User not found';
export const DRIVER_NOT_FOUND = '404002: Driver not found';
export const TRAINER_NOT_FOUND = '404003: Trainer not found';
export const REGIONAL_NOT_FOUND = '404004: Regional not found';
export const NOT_FOUND = '404000: Not found';

export const INVALID_CREDENTIALS = '401001: Invalid credentials';
export const UNAUTHORIZED = '401002: Unauthorized';
export const UNAUTHORIZED_RESOURCE = '401000: Unauthorized resource';
export const FORBIDDEN = '403001: Forbidden';
export const FORBIDDEN_RESOURCE = '403000: Forbidden resource';

export const BAD_REQUEST = '400000: Bad request';
export const RATE_LIMIT_EXCEEDED = '429000: Rate limit exceeded';

export const USER_CONFLICT = '409001: User with this email already exists';
export const DRIVER_CONFLICT = '409002: Driver with this email already exists';
export const TRAINER_CONFLICT = '409003: Trainer with this email already exists';
export const REGIONAL_CONFLICT = '409004: Regional with this email already exists';

export const VALIDATION_ERROR = '422000: Validation error';
export const INTERNAL_SERVER_ERROR = '500000: Internal server error';
export const PRISMA_API_ERROR = '400023: Prismic API error';

// AWS S3 constants
export const AWS_S3_REGION = 'AWS_S3_REGION';
export const AWS_S3_ACCESS_KEY_ID = 'AWS_S3_ACCESS_KEY_ID';
export const AWS_S3_SECRET_ACCESS_KEY = 'AWS_S3_SECRET_ACCESS_KEY';
export const AWS_S3_BUCKET_NAME = 'AWS_S3_BUCKET_NAME';

// Redis constants
export const REDIS_HOST = 'REDIS_HOST';
export const REDIS_PORT = 'REDIS_PORT';
export const REDIS_PASSWORD = 'REDIS_PASSWORD';

// Mail constants
export const MAIL_HOST = 'MAIL_HOST';
export const MAIL_PORT = 'MAIL_PORT';
export const MAIL_USER = 'MAIL_USER';
export const MAIL_PASSWORD = 'MAIL_PASSWORD';
export const MAIL_FROM = 'MAIL_FROM';

// Auth constants
export const JWT_SECRET = 'JWT_SECRET';
export const JWT_EXPIRES_IN = 'JWT_EXPIRES_IN';
export const JWT_REFRESH_SECRET = 'JWT_REFRESH_SECRET';
export const JWT_REFRESH_EXPIRES_IN = 'JWT_REFRESH_EXPIRES_IN';

// Contact and site constants
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'contact@example.com';
export const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
export const SITE_NAME = process.env.SITE_NAME || 'ASFAAR API';
export const APP_NAME = process.env.APP_NAME || 'ASFAAR';
export const API_VERSION = process.env.API_VERSION || 'v1';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = process.env.PORT || 3000;

// Database constants
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR';
export const DATABASE_TIMEOUT_ERROR = 'DATABASE_TIMEOUT_ERROR';
export const UNIQUE_CONSTRAINT_ERROR = 'UNIQUE_CONSTRAINT_ERROR';
export const FOREIGN_KEY_CONSTRAINT_ERROR = 'FOREIGN_KEY_CONSTRAINT_ERROR';
export const NOT_FOUND_ERROR = 'NOT_FOUND_ERROR';

// Auth error messages
export const TOKEN_EXPIRED = 'Token has expired';
export const UNAUTHORIZED_ACCESS = 'Unauthorized access';
export const ACCOUNT_DEACTIVATED = 'Account is deactivated';

// General API errors
export const BAD_REQUEST_ERROR = 'Bad request';
export const FORBIDDEN_ERROR = 'Forbidden';
export const METHOD_NOT_ALLOWED = 'Method not allowed';
export const TOO_MANY_REQUESTS = 'Too many requests';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
