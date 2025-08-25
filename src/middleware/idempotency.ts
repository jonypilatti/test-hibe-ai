import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyKey } from '../models/IdempotencyKey';

export interface IdempotentRequest extends Request {
  idempotencyKey?: string;
  requestHash?: string;
}

export const checkIdempotency = () => {
  return async (req: IdempotentRequest, res: Response, next: NextFunction): Promise<void> => {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      res.status(400).json({
        error: 'Missing idempotency key',
        details: ['Idempotency-Key header is required'],
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      res.status(400).json({
        error: 'Invalid idempotency key format',
        details: ['Idempotency key must be a valid UUID'],
      });
      return;
    }

    try {
      // Create hash of request body
      const requestBody = JSON.stringify(req.body);
      const requestHash = crypto.createHash('sha256').update(requestBody).digest('hex');

      // Check if idempotency key exists
      const existingKey = await IdempotencyKey.findOne({
        where: { key: idempotencyKey },
      });

      if (existingKey) {
        // Check if request hash matches
        if (existingKey.requestHash === requestHash) {
          // Same request, return cached response
          const cachedResponse = JSON.parse(existingKey.responseData);
          res.status(200).json(cachedResponse);
          return;
        } else {
          // Same key, different payload - conflict
          res.status(409).json({
            error: 'Idempotency key conflict',
            details: ['The provided idempotency key is already used with different data'],
          });
          return;
        }
      }

      // Store request info for later use
      req.idempotencyKey = idempotencyKey;
      req.requestHash = requestHash;
      next();
    } catch (error) {
      console.error('Error checking idempotency:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: ['Failed to process idempotency check'],
      });
    }
  };
};

export const storeIdempotencyResponse = async (
  idempotencyKey: string,
  requestHash: string,
  responseData: any
): Promise<void> => {
  try {
    // Store response for 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await IdempotencyKey.create({
      key: idempotencyKey,
      requestHash,
      responseData: JSON.stringify(responseData),
      expiresAt,
    });
  } catch (error) {
    console.error('Error storing idempotency response:', error);
    // Don't fail the request if we can't store the idempotency data
  }
};
