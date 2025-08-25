import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentHistory } from '../models';
import { storeIdempotencyResponse } from '../middleware/idempotency';
import { appConfig } from '../config/config';
import { Op } from 'sequelize';

export interface CreatePaymentRequest {
  description: string;
  due_date: string;  // Cambiar de dueDate a due_date para coincidir con el request
  amount_cents: number;  // Cambiar de amountCents a amount_cents
  currency: 'USD' | 'ARS';
  payer: {
    name: string;
    email: string;
  };
}

export interface CreatePaymentResponse {
  paymentId: string;
  status: 'pending' | 'paid' | 'reversed';
  checkoutUrl: string;
}

export interface ListPaymentsQuery {
  status?: 'pending' | 'paid' | 'reversed';
  limit?: number;
  cursor?: string;
}

export interface ListPaymentsResponse {
  items: Array<{
    id: string;
    description: string;
    dueDate: string;
    amountCents: number;
    currency: 'USD' | 'ARS';
    payerName: string;
    payerEmail: string;
    status: 'pending' | 'paid' | 'reversed';
    checkoutUrl: string;
    createdAt: string;
  }>;
  nextCursor?: string;
}

export interface WebhookUpdateRequest {
  paymentId: string;
  newStatus: 'paid' | 'reversed';
  reason?: string;
}

export class PaymentService {
  private readonly checkoutBaseUrl: string;

  constructor() {
    this.checkoutBaseUrl = appConfig.urls.checkoutBase;
  }

  async createPayment(
    request: CreatePaymentRequest,
    idempotencyKey: string,
    requestHash: string
  ): Promise<CreatePaymentResponse> {
    try {
      const paymentId = uuidv4();
      const checkoutUrl = `${this.checkoutBaseUrl}/${paymentId}`;

      // Mapear campos del request (snake_case) al modelo (camelCase)
      const payment = await Payment.create({
        id: paymentId,
        description: request.description,
        dueDate: new Date(request.due_date),
        amountCents: request.amount_cents,
        currency: request.currency,
        payerName: request.payer.name,
        payerEmail: request.payer.email,
        status: 'pending',
        checkoutUrl,
        idempotencyKey,
      });

      const response: CreatePaymentResponse = {
        paymentId: payment.id,
        status: payment.status,
        checkoutUrl: payment.checkoutUrl,
      };

      // Store response for idempotency
      await storeIdempotencyResponse(idempotencyKey, requestHash, response);

      return response;
    } catch (error) {
      console.error('❌ Error creating payment:', error);
      throw error;
    }
  }

  async listPayments(query: ListPaymentsQuery): Promise<ListPaymentsResponse> {
    const limit = Math.min(query.limit || 20, 100);
    const whereClause: any = {};
    
    if (query.status) {
      whereClause.status = query.status;
    }

    const options: any = {
      where: whereClause,
      limit: limit + 1, // Get one extra to check if there's a next page
      order: [['createdAt', 'DESC']],
    };

    if (query.cursor) {
      options.where.createdAt = {
        [Op.lt]: new Date(query.cursor),
      };
    }

    const payments = await Payment.findAll(options);
    
    const hasNextPage = payments.length > limit;
    const items = payments.slice(0, limit).map(payment => {
      // Handle dueDate - it can be either a Date object or a string
      let dueDateStr: string;
      if (payment.dueDate instanceof Date) {
        dueDateStr = payment.dueDate.toISOString().split('T')[0] ||'';
      } else if (typeof payment.dueDate === 'string') {
        dueDateStr = payment.dueDate;
      } else {
        dueDateStr = '';
      }

      // Handle createdAt - it can be either a Date object or a string
      let createdAtStr = '';
      if (payment.createdAt) {
        if (payment.createdAt instanceof Date) {
          createdAtStr = payment.createdAt.toISOString();
        } else if (typeof payment.createdAt === 'string') {
          createdAtStr = payment.createdAt;
        }
      }

      return {
        id: payment.id,
        description: payment.description,
        dueDate: dueDateStr,
        amountCents: payment.amountCents,
        currency: payment.currency,
        payerName: payment.payerName,
        payerEmail: payment.payerEmail,
        status: payment.status,
        checkoutUrl: payment.checkoutUrl,
        createdAt: createdAtStr,
      };
    });

    let nextCursor: string | undefined;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        nextCursor = lastItem.createdAt;
      }
    }

    return {
      items,
      ...(nextCursor && { nextCursor }),
    };
  }

  async updatePaymentStatus(request: WebhookUpdateRequest): Promise<void> {
    const payment = await Payment.findByPk(request.paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(payment.status, request.newStatus)) {
      throw new Error(`Invalid status transition from ${payment.status} to ${request.newStatus}`);
    }

    const oldStatus = payment.status;
    
    // Update payment status
    await payment.update({ status: request.newStatus });

    // Record in history
    await PaymentHistory.create({
      paymentId: payment.id,
      oldStatus,
      newStatus: request.newStatus,
      reason: request.reason || '',
    });
  }

  private isValidStatusTransition(
    currentStatus: 'pending' | 'paid' | 'reversed',
    newStatus: 'paid' | 'reversed'
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['paid'],
      paid: ['reversed'],
      reversed: [], // No valid transitions from reversed
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return Payment.findByPk(paymentId);
  }
}
