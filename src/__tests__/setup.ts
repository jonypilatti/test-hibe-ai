// Test setup file for Jest
import { jest } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Mock process.env for tests (fixed TS4111)
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '3000';
process.env['DB_PATH'] = ':memory:';
process.env['WEBHOOK_TOKEN'] = 'test-webhook-token-123456789012345678901234567890';
process.env['JWT_SECRET'] = 'test-jwt-secret-123456789012345678901234567890';
process.env['CHECKOUT_BASE_URL'] = 'https://test.example.com/checkout';

// Increase Jest timeout for async operations
jest.setTimeout(10000);

// Global test utilities (fixed TS7017)
declare global {
  var testUtils: {
    generateUUID: () => string;
    generateEmail: () => string;
    generateFutureDate: (days?: number) => Date;
  };
}

global.testUtils = {
  generateUUID: () => uuidv4(), // Use uuidv4 for real UUIDs
  generateEmail: () => `test-${Date.now()}@example.com`,
  generateFutureDate: (days = 7) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  },
};

// Mock crypto for consistent hashing in idempotency tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: async (_algorithm: string, data: Uint8Array) => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data[i];
          if (char !== undefined) { // Fixed 'char' is possibly 'undefined'
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
          }
        }
        return new Uint8Array(new ArrayBuffer(32)); // Return a fixed array for consistency
      },
    },
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        digest: jest.fn().mockReturnValue('mock-hash-123'),
      }),
    }),
  },
});

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
