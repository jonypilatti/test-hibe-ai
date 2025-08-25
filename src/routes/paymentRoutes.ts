import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';
import { BatchPaymentController } from '../controllers/BatchPaymentController';
import { validateRequest, validateQuery } from '../middleware/validation';
import { checkIdempotency } from '../middleware/idempotency';
import { createPaymentSchema, batchPaymentSchema, listPaymentsSchema } from '../validations/paymentSchemas';

export const createPaymentRoutes = (
  paymentController: PaymentController,
  batchPaymentController: BatchPaymentController
): Router => {
  const router = Router();

  // Create single payment
  router.post(
    '/',
    checkIdempotency(),
    validateRequest(createPaymentSchema),
    paymentController.createPayment.bind(paymentController)
  );

  // List payments
  router.get(
    '/',
    validateQuery(listPaymentsSchema),
    paymentController.listPayments.bind(paymentController)
  );

  // Batch payments
  router.post(
    '/batch',
    checkIdempotency(),
    validateRequest(batchPaymentSchema),
    batchPaymentController.processBatch.bind(batchPaymentController)
  );

  return router;
};
