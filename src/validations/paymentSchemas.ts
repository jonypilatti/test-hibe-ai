import Joi from 'joi';

// Schema for creating a single payment
export const createPaymentSchema = Joi.object({
  description: Joi.string().min(1).max(200).required()
    .messages({
      'string.empty': 'Description is required',
      'string.min': 'Description must be at least 1 character long',
      'string.max': 'Description cannot exceed 200 characters',
      'any.required': 'Description is required',
    }),
  due_date: Joi.string().isoDate().custom((value, helpers) => {
    const date = new Date(value);
    if (date <= new Date()) {
      return helpers.error('date.future');
    }
    return value;
  }).required()
    .messages({
      'string.base': 'Due date must be a string',
      'string.isoDate': 'Due date must be a valid ISO date string (YYYY-MM-DD)',
      'date.future': 'Due date must be in the future',
      'any.required': 'Due date is required',
    }),
  amount_cents: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required',
    }),
  currency: Joi.string().valid('USD', 'ARS').required()
    .messages({
      'string.empty': 'Currency is required',
      'any.only': 'Currency must be either USD or ARS',
      'any.required': 'Currency is required',
    }),
  payer: Joi.object({
    name: Joi.string().min(1).required()
      .messages({
        'string.empty': 'Payer name is required',
        'string.min': 'Payer name must be at least 1 character long',
        'any.required': 'Payer name is required',
      }),
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Payer email is required',
        'string.email': 'Payer email must be a valid email address',
        'any.required': 'Payer email is required',
      }),
  }).required()
    .messages({
      'object.base': 'Payer information is required',
      'any.required': 'Payer information is required',
    }),
});

// Schema for batch payment creation
export const batchPaymentSchema = Joi.object({
  payments: Joi.array().items(createPaymentSchema).min(1).max(100).required()
    .messages({
      'array.base': 'Payments must be an array',
      'array.min': 'At least one payment is required',
      'array.max': 'Maximum 100 payments allowed per batch',
      'any.required': 'Payments array is required',
    }),
});

// Schema for webhook simulation
export const webhookSchema = Joi.object({
  payment_id: Joi.string().uuid().required()
    .messages({
      'string.empty': 'Payment ID is required',
      'string.guid': 'Payment ID must be a valid UUID',
      'any.required': 'Payment ID is required',
    }),
  new_status: Joi.string().valid('paid', 'reversed').required()
    .messages({
      'string.empty': 'New status is required',
      'any.only': 'New status must be either paid or reversed',
      'any.required': 'New status is required',
    }),
  reason: Joi.string().optional()
    .messages({
      'string.base': 'Reason must be a string',
    }),
});

// Schema for payment listing query parameters
export const listPaymentsSchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'reversed').optional()
    .messages({
      'any.only': 'Status must be one of: pending, paid, reversed',
    }),
  limit: Joi.number().integer().min(1).max(100).default(20)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
    }),
  cursor: Joi.string().optional()
    .messages({
      'string.base': 'Cursor must be a string',
    }),
});
