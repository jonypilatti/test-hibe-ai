import { PaymentController } from '../controllers/PaymentController';
import { PaymentService } from '../services/PaymentService';
import { Request, Response } from 'express';

// Mock the PaymentService
jest.mock('../services/PaymentService');

// Extend Request interface for idempotency properties
interface IdempotentRequest extends Request {
  idempotencyKey?: string;
  requestHash?: string;
}

describe('PaymentController', () => {
  let paymentController: PaymentController;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockRequest: Partial<IdempotentRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPaymentService = {
      createPayment: jest.fn(),
      listPayments: jest.fn(),
      updatePaymentStatus: jest.fn(),
      getPaymentById: jest.fn(),
    } as unknown as jest.Mocked<PaymentService>;
    
    paymentController = new PaymentController(mockPaymentService);
    
    mockRequest = {
      body: {
        description: 'Test payment',
        due_date: '2025-12-31',
        amount_cents: 1000,
        currency: 'USD',
        payer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      },
      idempotencyKey: 'test-key-123',
      requestHash: 'test-hash-123',
      query: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const mockResult = {
        paymentId: 'test-uuid-123',
        status: 'pending',
        checkoutUrl: 'https://example.com/checkout/test-uuid-123',
      };

      mockPaymentService.createPayment = jest.fn().mockResolvedValue(mockResult);

      await paymentController.createPayment(
        mockRequest as IdempotentRequest,
        mockResponse as Response
      );

      expect(mockPaymentService.createPayment).toHaveBeenCalledWith(
        mockRequest.body,
        mockRequest.idempotencyKey,
        mockRequest.requestHash
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockPaymentService.createPayment = jest.fn().mockRejectedValue(error);

      await paymentController.createPayment(
        mockRequest as IdempotentRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to create payment'],
      });
    });

    it('should handle missing idempotency information', async () => {
      mockRequest.idempotencyKey = '';
      mockRequest.requestHash = '';

      await paymentController.createPayment(
        mockRequest as IdempotentRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Idempotency information missing'],
      });
    });
  });

  describe('listPayments', () => {
    it('should list payments successfully', async () => {
      const mockResult = {
        items: [
          {
            id: 'payment-1',
            description: 'Payment 1',
            dueDate: '2025-12-31',
            amountCents: 1000,
            currency: 'USD',
            payerName: 'John Doe',
            payerEmail: 'john@example.com',
            status: 'pending',
            checkoutUrl: 'https://example.com/checkout/payment-1',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        nextCursor: '2025-01-01T00:00:00.000Z',
      };

      mockPaymentService.listPayments = jest.fn().mockResolvedValue(mockResult);

      await paymentController.listPayments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.listPayments).toHaveBeenCalledWith({});
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockPaymentService.listPayments = jest.fn().mockRejectedValue(error);

      await paymentController.listPayments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to list payments'],
      });
    });

    it('should handle query parameters correctly', async () => {
      mockRequest.query = {
        status: 'pending',
        limit: '10',
        cursor: 'cursor-123',
      };

      const mockResult = { items: [] };
      mockPaymentService.listPayments = jest.fn().mockResolvedValue(mockResult);

      await paymentController.listPayments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.listPayments).toHaveBeenCalledWith({
        status: 'pending',
        limit: 10,
        cursor: 'cursor-123',
      });
    });

    it('should handle undefined query parameters', async () => {
      mockRequest.query = {
        status: undefined,
        limit: undefined,
        cursor: undefined,
      };

      const mockResult = { items: [] };
      mockPaymentService.listPayments = jest.fn().mockResolvedValue(mockResult);

      await paymentController.listPayments(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentService.listPayments).toHaveBeenCalledWith({});
    });
  });
});
