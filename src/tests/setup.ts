import { config } from 'dotenv';
import { join } from 'path';

// Load test environment variables
config({
  path: join(process.cwd(), '.env.test'),
});

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
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  randomEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  randomString: (length = 10) => Math.random().toString(36).substr(2, length),
}; 