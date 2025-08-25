import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  webhookToken?: string;
}

export const authenticateWebhook = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const webhookToken = req.headers['x-webhook-token'] as string;
  const expectedToken = process.env.WEBHOOK_TOKEN;

  if (!webhookToken) {
    res.status(401).json({
      error: 'Missing webhook token',
      details: ['X-Webhook-Token header is required'],
    });
    return;
  }

  if (!expectedToken) {
    console.error('WEBHOOK_TOKEN environment variable is not set');
    res.status(500).json({
      error: 'Server configuration error',
      details: ['Webhook token not configured'],
    });
    return;
  }

  if (webhookToken !== expectedToken) {
    res.status(401).json({
      error: 'Invalid webhook token',
      details: ['The provided webhook token is invalid'],
    });
    return;
  }

  req.webhookToken = webhookToken;
  next();
};
