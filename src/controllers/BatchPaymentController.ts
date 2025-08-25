import { Response } from 'express';
import { BatchPaymentService } from '../services/BatchPaymentService';
import { IdempotentRequest } from '../middleware/idempotency';

export class BatchPaymentController {
  private batchPaymentService: BatchPaymentService;

  constructor(batchPaymentService: BatchPaymentService) {
    this.batchPaymentService = batchPaymentService;
  }

  async processBatch(req: IdempotentRequest, res: Response): Promise<void> {
    try {
      const { idempotencyKey, requestHash } = req;
      
      if (!idempotencyKey || !requestHash) {
        res.status(500).json({
          error: 'Internal server error',
          details: ['Idempotency information missing'],
        });
        return;
      }

      const result = await this.batchPaymentService.processBatch(
        req.body,
        idempotencyKey,
        requestHash
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error processing batch payments:', error);
      
      if (error instanceof Error && error.message.includes('Maximum 100 payments')) {
        res.status(400).json({
          error: 'Validation failed',
          details: [error.message],
        });
        return;
      }

      res.status(500).json({
        error: 'Internal server error',
        details: ['Failed to process batch payments'],
      });
    }
  }
}
