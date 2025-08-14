import { config } from 'dotenv';
import { join } from 'path';
import { existsSync } from 'fs';

// Load test environment variables if file exists
const envTestPath = join(process.cwd(), '.env.test');
if (existsSync(envTestPath)) {
  config({
    path: envTestPath,
  });
} else {
  // Set minimal test environment variables if .env.test doesn't exist
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:./test.db';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.APP_NAME = 'Asfaar Visa Services API - Test';
  process.env.SITE_URL = 'http://localhost:3001';
  process.env.MAIL_PROVIDER = 'smtp';
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'test@example.com';
  process.env.SMTP_PASS = 'test-password';
  process.env.MAIL_FROM_NAME = 'Test Service';
  process.env.MAIL_FROM_EMAIL = 'test@example.com';
}

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  randomEmail: () =>
    `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  randomString: (length = 10) => Math.random().toString(36).substr(2, length),
};
