import { PaymentService } from '../services/PaymentService';
import { Payment, PaymentHistory } from '../models';
import { storeIdempotencyResponse } from '../middleware/idempotency';
import { Op } from 'sequelize';

// Mock the models
jest.mock('../models', () => ({
  Payment: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    count: jest.fn(),
  },
  PaymentHistory: {
    create: jest.fn(),
  },
}));

// Mock the idempotency middleware
jest.mock('../middleware/idempotency', () => ({
  storeIdempotencyResponse: jest.fn(),
}));

describe('PaymentService', () => {
  let paymentService: PaymentService;
  const mockPayment = {
    id: 'test-uuid-123',
    description: 'Test payment',
    dueDate: new Date('2026-01-15'),
    amountCents: 5000,
    currency: 'USD' as const,
    payerName: 'Test User',
    payerEmail: 'test@example.com',
    status: 'pending' as const,
    checkoutUrl: 'https://sandbox.hibe.local/checkout/test-uuid-123',
    idempotencyKey: 'test-key-123',
    createdAt: new Date('2025-08-25T00:00:00.000Z'),
    updatedAt: new Date('2025-08-25T00:00:00.000Z'),
    toJSON: () => ({
      id: 'test-uuid-123',
      description: 'Test payment',
      dueDate: '2026-01-15',
      amountCents: 5000,
      currency: 'USD',
      payerName: 'Test User',
      payerEmail: 'test@example.com',
      status: 'pending',
      checkoutUrl: 'https://sandbox.hibe.local/checkout/test-uuid-123',
      idempotencyKey: 'test-key-123',
      createdAt: '2025-08-25T00:00:00.000Z',
      updatedAt: '2025-08-25T00:00:00.000Z',
    }),
  };

  beforeEach(() => {
    paymentService = new PaymentService();
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should create a payment with valid data', async () => {
      const mockRequest = {
        description: 'Test payment',
        due_date: '2026-01-15',
        amount_cents: 5000,
        currency: 'USD' as const,
        payer: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const mockIdempotencyKey = 'test-key-123';
      const mockRequestHash = 'test-hash-123';

      (Payment.create as jest.Mock).mockResolvedValue(mockPayment);
      (storeIdempotencyResponse as jest.Mock).mockResolvedValue(undefined);

      const result = await paymentService.createPayment(
        mockRequest,
        mockIdempotencyKey,
        mockRequestHash
      );

      expect(Payment.create).toHaveBeenCalledWith({
        id: expect.any(String),
        description: 'Test payment',
        dueDate: new Date('2026-01-15'),
        amountCents: 5000,
        currency: 'USD',
        payerName: 'Test User',
        payerEmail: 'test@example.com',
        status: 'pending',
        checkoutUrl: expect.stringContaining('https://test.example.com/checkout/'),
        idempotencyKey: 'test-key-123',
      });

      expect(result).toEqual({
        paymentId: 'test-uuid-123',
        status: 'pending',
        checkoutUrl: 'https://sandbox.hibe.local/checkout/test-uuid-123',
      });

      expect(storeIdempotencyResponse).toHaveBeenCalledWith(
        mockIdempotencyKey,
        mockRequestHash,
        result
      );
    });

    it('should handle errors during payment creation', async () => {
      const mockRequest = {
        description: 'Test payment',
        due_date: '2026-01-15',
        amount_cents: 5000,
        currency: 'USD' as const,
        payer: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const error = new Error('Database connection failed');
      (Payment.create as jest.Mock).mockRejectedValue(error);

      await expect(
        paymentService.createPayment(mockRequest, 'test-key', 'test-hash')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('listPayments', () => {
    it('should return payments with pagination', async () => {
      const mockPayments = [
        { ...mockPayment, id: 'payment-1' },
        { ...mockPayment, id: 'payment-2' },
        { ...mockPayment, id: 'payment-3' },
      ];

      (Payment.findAll as jest.Mock).mockResolvedValue(mockPayments);

      const result = await paymentService.listPayments({
        limit: 2,
        status: 'pending',
      });

      expect(Payment.findAll).toHaveBeenCalledWith({
        where: { status: 'pending' },
        limit: 3, // limit + 1 for pagination check
        order: [['createdAt', 'DESC']],
      });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.id).toBe('payment-1');
      expect(result.items[1]?.id).toBe('payment-2');
      expect(result.nextCursor).toBe('2025-08-25T00:00:00.000Z');
    });

    it('should handle cursor-based pagination', async () => {
      const mockPayments = [
        { ...mockPayment, id: 'payment-1' },
        { ...mockPayment, id: 'payment-2' },
      ];

      (Payment.findAll as jest.Mock).mockResolvedValue(mockPayments);

      await paymentService.listPayments({
        limit: 2,
        cursor: '2025-08-25T00:00:00.000Z',
      });

      expect(Payment.findAll).toHaveBeenCalledWith({
        where: {
          createdAt: {
            [Op.lt]: new Date('2025-08-25T00:00:00.000Z'),
          },
        },
        limit: 3,
        order: [['createdAt', 'DESC']],
      });
    });

    it('should handle empty results', async () => {
      (Payment.findAll as jest.Mock).mockResolvedValue([]);

      await paymentService.listPayments({ limit: 10 });

      expect(Payment.findAll).toHaveBeenCalled();
    });

    it('should respect maximum limit', async () => {
      const result = await paymentService.listPayments({ limit: 150 });

      expect(result.items).toHaveLength(0);
    });
  });

  describe('updatePaymentStatus', () => {
    it('should update payment status successfully', async () => {
      const mockPaymentToUpdate = {
        ...mockPayment,
        status: 'pending' as const,
        update: jest.fn().mockResolvedValue(undefined),
      };

      (Payment.findByPk as jest.Mock).mockResolvedValue(mockPaymentToUpdate);
      (PaymentHistory.create as jest.Mock).mockResolvedValue(undefined);

      await paymentService.updatePaymentStatus({
        paymentId: 'test-uuid-123',
        newStatus: 'paid',
        reason: 'Payment completed',
      });

      expect(mockPaymentToUpdate.update).toHaveBeenCalledWith({
        status: 'paid',
      });

      expect(PaymentHistory.create).toHaveBeenCalledWith({
        paymentId: 'test-uuid-123',
        oldStatus: 'pending',
        newStatus: 'paid',
        reason: 'Payment completed',
      });
    });

    it('should throw error for non-existent payment', async () => {
      (Payment.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        paymentService.updatePaymentStatus({
          paymentId: 'non-existent',
          newStatus: 'paid',
        })
      ).rejects.toThrow('Payment not found');
    });

    it('should throw error for invalid status transition', async () => {
      const mockPaymentToUpdate = {
        ...mockPayment,
        status: 'paid' as const,
      };

      (Payment.findByPk as jest.Mock).mockResolvedValue(mockPaymentToUpdate);

      await expect(
        paymentService.updatePaymentStatus({
          paymentId: 'test-uuid-123',
          newStatus: 'paid',
        })
      ).rejects.toThrow('Invalid status transition from paid to paid');
    });
  });

  describe('getPaymentById', () => {
    it('should return payment by ID', async () => {
      (Payment.findByPk as jest.Mock).mockResolvedValue(mockPayment);

      const result = await paymentService.getPaymentById('test-uuid-123');

      expect(Payment.findByPk).toHaveBeenCalledWith('test-uuid-123');
      expect(result).toEqual(mockPayment);
    });

    it('should return null for non-existent payment', async () => {
      (Payment.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await paymentService.getPaymentById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('status transition validation', () => {
    it('should validate pending to paid transition', () => {
      const result = (paymentService as any).isValidStatusTransition('pending', 'paid');
      expect(result).toBe(true);
    });

    it('should validate paid to reversed transition', () => {
      const result = (paymentService as any).isValidStatusTransition('paid', 'reversed');
      expect(result).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect((paymentService as any).isValidStatusTransition('pending', 'reversed')).toBe(false);
      expect((paymentService as any).isValidStatusTransition('reversed', 'paid')).toBe(false);
      expect((paymentService as any).isValidStatusTransition('reversed', 'pending')).toBe(false);
    });
  });
});
