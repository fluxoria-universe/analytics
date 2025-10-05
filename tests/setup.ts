import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database connections if needed
});

afterAll(async () => {
  // Cleanup test resources
});

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
