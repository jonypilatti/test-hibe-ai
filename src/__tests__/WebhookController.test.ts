import { WebhookController } from '../controllers/WebhookController';
import { PaymentService } from '../services/PaymentService';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';

// Mock the PaymentService
jest.mock('../services/PaymentService');

describe('WebhookController', () => {
  let webhookController: WebhookController;
  let mockPaymentService: jest.Mocked<PaymentService>;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockPaymentService = {
      createPayment: jest.fn(),
      listPayments: jest.fn(),
      updatePaymentStatus: jest.fn(),
      getPaymentById: jest.fn(),
    } as unknown as jest.Mocked<PaymentService>;
    webhookController = new WebhookController(mockPaymentService);
    
    mockRequest = {
      body: {
        payment_id: 'test-payment-123',
        new_status: 'paid',
        reason: 'Payment completed',
      },
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('simulateStatusUpdate', () => {
    it('should successfully update payment status', async () => {
      mockPaymentService.updatePaymentStatus = jest.fn().mockResolvedValue(undefined);

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockPaymentService.updatePaymentStatus).toHaveBeenCalledWith({
        paymentId: 'test-payment-123',
        newStatus: 'paid',
        reason: 'Payment completed',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Payment status updated successfully',
        payment_id: 'test-payment-123',
        new_status: 'paid',
        reason: 'Payment completed',
      });
    });

    it('should handle missing payment_id', async () => {
      mockRequest.body = {
        new_status: 'paid',
        reason: 'Payment completed',
      };

      // Mock the service to throw an error when payment_id is missing
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue(
        new Error('Payment ID is required')
      );

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to update payment status'],
      });
    });

    it('should handle missing new_status', async () => {
      mockRequest.body = {
        payment_id: 'test-payment-123',
        reason: 'Payment completed',
      };

      // Mock the service to throw an error when new_status is missing
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue(
        new Error('New status is required')
      );

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to update payment status'],
      });
    });

    it('should handle payment not found error', async () => {
      const error = new Error('Payment not found');
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue(error);

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Payment not found',
        details: ['Payment not found'],
      });
    });

    it('should handle invalid status transition error', async () => {
      const error = new Error('Invalid status transition from paid to paid');
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue(error);

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid status transition',
        details: ['Invalid status transition from paid to paid'],
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue(error);

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to update payment status'],
      });
    });

    it('should handle optional reason field', async () => {
      mockRequest.body = {
        payment_id: 'test-payment-123',
        new_status: 'paid',
        // reason is optional
      };
      
      mockPaymentService.updatePaymentStatus = jest.fn().mockResolvedValue(undefined);

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockPaymentService.updatePaymentStatus).toHaveBeenCalledWith({
        paymentId: 'test-payment-123',
        newStatus: 'paid',
        reason: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle non-Error objects', async () => {
      mockPaymentService.updatePaymentStatus = jest.fn().mockRejectedValue('String error');

      await webhookController.simulateStatusUpdate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to update payment status'],
      });
    });
  });
});
