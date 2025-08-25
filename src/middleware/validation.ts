import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';

export interface ValidationError {
  error: string;
  details: string[];
}

export const validateRequest = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => detail.message);
      const validationError: ValidationError = {
        error: 'Validation failed',
        details,
      };
      
      res.status(400).json(validationError);
      return;
    }

    next();
  };
};

export const validateQuery = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => detail.message);
      const validationError: ValidationError = {
        error: 'Invalid query parameters',
        details,
      };
      
      res.status(400).json(validationError);
      return;
    }

    next();
  };
};
