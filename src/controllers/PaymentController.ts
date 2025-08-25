import { Request, Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { IdempotentRequest } from '../middleware/idempotency';

export class PaymentController {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  async createPayment(req: IdempotentRequest, res: Response): Promise<void> {
    try {
      console.log('🔍 Controller - Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 Controller - Idempotency key:', req.idempotencyKey);
      console.log('🔍 Controller - Request hash:', req.requestHash);
      
      const { idempotencyKey, requestHash } = req;
      
      if (!idempotencyKey || !requestHash) {
        console.error('❌ Controller - Missing idempotency info');
        res.status(500).json({
          error: 'Internal server error',
          details: ['Idempotency information missing'],
        });
        return;
      }

      console.log('🔍 Controller - Calling payment service...');
      const result = await this.paymentService.createPayment(
        req.body,
        idempotencyKey,
        requestHash
      );

      console.log('🔍 Controller - Payment service result:', result);
      res.status(201).json(result);
    } catch (error) {
      console.error('❌ Controller - Error creating payment:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: ['Failed to create payment'],
      });
    }
  }

  async listPayments(req: Request, res: Response): Promise<void> {
    try {
      const query: any = {
        ...(req.query['status'] && { status: req.query['status'] as 'pending' | 'paid' | 'reversed' }),
        ...(req.query['limit'] && { limit: parseInt(req.query['limit'] as string) }),
        ...(req.query['cursor'] && { cursor: req.query['cursor'] as string }),
      };

      const result = await this.paymentService.listPayments(query);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error listing payments:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: ['Failed to list payments'],
      });
    }
  }
}
