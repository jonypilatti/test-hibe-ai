import { Response } from 'express';
import { PaymentService } from '../services/PaymentService';
import { AuthenticatedRequest } from '../middleware/auth';

export class WebhookController {
  private paymentService: PaymentService;

  constructor(paymentService: PaymentService) {
    this.paymentService = paymentService;
  }

  async simulateStatusUpdate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { payment_id, new_status, reason } = req.body;

      await this.paymentService.updatePaymentStatus({
        paymentId: payment_id,
        newStatus: new_status,
        reason,
      });

      res.status(200).json({
        message: 'Payment status updated successfully',
        payment_id,
        new_status,
        reason,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Payment not found')) {
          res.status(404).json({
            error: 'Payment not found',
            details: [error.message],
          });
          return;
        }
        
        if (error.message.includes('Invalid status transition')) {
          res.status(422).json({
            error: 'Invalid status transition',
            details: [error.message],
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Internal server error',
        details: ['Failed to update payment status'],
      });
    }
  }
}
