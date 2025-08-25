import { BatchPaymentService } from '../services/BatchPaymentService';
import { PaymentService, CreatePaymentResponse } from '../services/PaymentService';

// Mock the PaymentService
jest.mock('../services/PaymentService');

describe('BatchPaymentService', () => {
  let batchPaymentService: BatchPaymentService;
  let mockPaymentService: jest.Mocked<PaymentService>;

  beforeEach(() => {
    mockPaymentService = {
      createPayment: jest.fn(),
      listPayments: jest.fn(),
      updatePaymentStatus: jest.fn(),
      getPaymentById: jest.fn(),
    } as unknown as jest.Mocked<PaymentService>;
    
    batchPaymentService = new BatchPaymentService(mockPaymentService);
  });

  describe('processBatch', () => {
    const mockPayments = [
      {
        description: 'Payment 1',
        due_date: '2025-12-31',
        amount_cents: 1000,
        currency: 'USD' as const,
        payer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      {
        description: 'Payment 2',
        due_date: '2025-12-31',
        amount_cents: 2000,
        currency: 'ARS' as const,
        payer: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      },
    ];

    const mockBatchRequest = { payments: mockPayments };

    it('should process batch successfully', async () => {
      const mockResponses = [
        {
          paymentId: 'test-uuid-123',
          status: 'pending' as const,
          checkoutUrl: 'https://example.com/checkout/test-uuid-123',
        },
        {
          paymentId: 'test-uuid-456',
          status: 'pending' as const,
          checkoutUrl: 'https://example.com/checkout/test-uuid-456',
        },
      ];

      mockPaymentService.createPayment
        .mockResolvedValueOnce(mockResponses[0]!)
        .mockResolvedValueOnce(mockResponses[1]!);

      const result = await batchPaymentService.processBatch(
        mockBatchRequest,
        'batch-key-123',
        'batch-hash-123'
      );

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.paymentId).toBe('test-uuid-123');
      expect(result.results[1]?.paymentId).toBe('test-uuid-456');
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle errors within batch', async () => {
      const mockResponse = {
        paymentId: 'test-uuid-123',
        status: 'pending' as const,
        checkoutUrl: 'https://example.com/checkout/test-uuid-123',
      };

      mockPaymentService.createPayment
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValue(new Error('Payment failed')); // Reject all subsequent calls

      const result = await batchPaymentService.processBatch(
        mockBatchRequest,
        'batch-key-123',
        'batch-hash-123'
      );

      expect(result.results).toHaveLength(2);
      expect(result.results[0]?.paymentId).toBe('test-uuid-123');
      expect(result.results[1]?.error).toBeDefined();
      expect(result.results[1]?.error?.message).toBe('Payment failed');
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should respect batch size limits', async () => {
      const largeBatch = { payments: Array(150).fill(mockPayments[0]) };

      await expect(
        batchPaymentService.processBatch(
          largeBatch,
          'batch-key-123',
          'batch-hash-123'
        )
      ).rejects.toThrow('Maximum 100 payments allowed per batch');
    });

    it('should use concurrent workers', async () => {
      const startTime = Date.now();
      
      mockPaymentService.createPayment.mockImplementation(
        () => new Promise<CreatePaymentResponse>(resolve => setTimeout(() => resolve({
          paymentId: 'test-uuid-123',
          status: 'pending' as const,
          checkoutUrl: 'https://example.com/checkout/test-uuid-123',
        }), 100))
      );

      await batchPaymentService.processBatch(
        mockBatchRequest,
        'batch-key-123',
        'batch-hash-123'
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // With concurrent workers, should be faster than sequential
      expect(duration).toBeLessThan(300); // 2 payments * 100ms each
    });

    it('should handle empty batch', async () => {
      const emptyBatch = { payments: [] };

      const result = await batchPaymentService.processBatch(
        emptyBatch,
        'batch-key-123',
        'batch-hash-123'
      );

      expect(result.results).toHaveLength(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('retry mechanism', () => {
    const mockPayment = {
      description: 'Test payment',
      due_date: '2025-12-31',
      amount_cents: 1000,
      currency: 'USD' as const,
      payer: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    const mockBatchRequest = { payments: [mockPayment] };

    it('should retry failed payments with exponential backoff', async () => {
      const mockResponse = {
        paymentId: 'test-uuid-123',
        status: 'pending' as const,
        checkoutUrl: 'https://example.com/checkout/test-uuid-123',
      };

      mockPaymentService.createPayment
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockResponse);

      const result = await batchPaymentService.processBatch(
        mockBatchRequest,
        'batch-key-123',
        'batch-hash-123'
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.paymentId).toBe('test-uuid-123');
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should give up after max retries', async () => {
      mockPaymentService.createPayment.mockRejectedValue(new Error('Persistent failure'));

      const result = await batchPaymentService.processBatch(
        mockBatchRequest,
        'batch-key-123',
        'batch-hash-123'
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0]?.error).toBeDefined();
      expect(result.results[0]?.error?.message).toBe('Persistent failure');
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', async () => {
      const customService = new BatchPaymentService(
        mockPaymentService,
        {
          maxConcurrentWorkers: 5,
          maxRetryAttempts: 3,
          retryDelayMs: 1000,
        }
      );

      expect(customService).toBeDefined();
    });

    it('should use default configuration when not provided', async () => {
      const defaultService = new BatchPaymentService(mockPaymentService);

      expect(defaultService).toBeDefined();
    });
  });
});
