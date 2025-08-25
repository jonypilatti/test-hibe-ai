import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { authenticateWebhook } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { webhookSchema } from '../validations/paymentSchemas';

export const createWebhookRoutes = (webhookController: WebhookController): Router => {
  const router = Router();

  // Simulate status update via webhook
  router.post(
    '/simulate',
    authenticateWebhook,
    validateRequest(webhookSchema),
    webhookController.simulateStatusUpdate.bind(webhookController)
  );

  return router;
};
