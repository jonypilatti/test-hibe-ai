import {
  createPaymentSchema,
  batchPaymentSchema,
  webhookSchema,
  listPaymentsSchema,
} from '../validations/paymentSchemas';

describe('Validation Schemas', () => {
  describe('createPaymentSchema', () => {
    const validPayment = {
      description: 'Test payment',
      due_date: '2025-12-31',
      amount_cents: 1000,
      currency: 'USD',
      payer: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    it('should validate correct payment data', () => {
      const result = createPaymentSchema.validate(validPayment);
      expect(result.error).toBeUndefined();
    });

    it('should require description', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.description = undefined as any;

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Description is required');
    });

    it('should validate description length', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.description = '';

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Description is required');

      const longDescription = 'a'.repeat(201);
      const longError = createPaymentSchema.validate({
        ...validPayment,
        description: longDescription,
      }).error;
      expect(longError?.details?.[0]?.message).toBe('Description cannot exceed 200 characters');
    });

    it('should require due_date', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.due_date = undefined as any;

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Due date is required');
    });

    it('should validate due_date format', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.due_date = 'invalid-date';

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Due date must be a valid ISO date string (YYYY-MM-DD)');

      const pastDate = '2020-01-01';
      const pastError = createPaymentSchema.validate({
        ...validPayment,
        due_date: pastDate,
      }).error;
      expect(pastError?.details?.[0]?.message).toBe('Due date must be in the future');
    });

    it('should require amount_cents', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.amount_cents = undefined as any;

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Amount is required');
    });

    it('should validate amount_cents type and constraints', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.amount_cents = 'not-a-number' as any;

      const typeError = createPaymentSchema.validate(invalidPayment).error;
      expect(typeError?.details?.[0]?.message).toBe('Amount must be a number');

      const decimalError = createPaymentSchema.validate({
        ...validPayment,
        amount_cents: 100.5,
      }).error;
      expect(decimalError?.details?.[0]?.message).toBe('Amount must be an integer');

      const negativeError = createPaymentSchema.validate({
        ...validPayment,
        amount_cents: -100,
      }).error;
      expect(negativeError?.details?.[0]?.message).toBe('Amount must be positive');

      const zeroError = createPaymentSchema.validate({
        ...validPayment,
        amount_cents: 0,
      }).error;
      expect(zeroError?.details?.[0]?.message).toBe('Amount must be positive');
    });

    it('should require currency', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.currency = undefined as any;

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Currency is required');
    });

    it('should validate currency values', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.currency = 'EUR';

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Currency must be either USD or ARS');
    });

    it('should require payer information', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.payer = undefined as any;

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Payer information is required');
    });

    it('should validate payer fields', () => {
      const invalidPayment = { ...validPayment };
      invalidPayment.payer.name = '';

      const error = createPaymentSchema.validate(invalidPayment).error;
      expect(error?.details?.[0]?.message).toBe('Payer name is required');
    });

    it('should validate payer email format', () => {
      const invalidPayment = { ...validPayment };
      // Ensure name is valid so validation fails on email
      invalidPayment.payer.name = 'Valid Name';
      invalidPayment.payer.email = 'invalid-email';

      const emailError = createPaymentSchema.validate(invalidPayment).error;
      expect(emailError?.details?.[0]?.message).toBe('Payer email must be a valid email address');
    });


  });

  describe('batchPaymentSchema', () => {
    const validBatch = {
      payments: [
        {
          description: 'Payment 1',
          due_date: '2025-12-31',
          amount_cents: 1000,
          currency: 'USD' as const,
          payer: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        {
          description: 'Payment 2',
          due_date: '2025-12-31',
          amount_cents: 2000,
          currency: 'ARS' as const,
          payer: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
        },
      ],
    };

    it('should validate correct batch data', () => {
      const result = batchPaymentSchema.validate(validBatch);
      expect(result.error).toBeUndefined();
    });

    it('should require payments array', () => {
      const invalidBatch = { payments: undefined };
      const error = batchPaymentSchema.validate(invalidBatch).error;
      expect(error?.details?.[0]?.message).toBe('Payments array is required');
    });

    it('should require at least one payment', () => {
      const invalidBatch = { payments: [] };
      const error = batchPaymentSchema.validate(invalidBatch).error;
      expect(error?.details?.[0]?.message).toBe('At least one payment is required');
    });

    it('should validate each payment in batch', () => {
      const invalidBatch = {
        payments: [
          validBatch.payments[0],
          {
            description: 'Invalid payment',
            due_date: '2020-01-01', // Past date
            amount_cents: -100, // Negative amount
            currency: 'EUR', // Invalid currency
            payer: {
              name: '',
              email: 'invalid-email',
            },
          },
        ],
      };

      const error = batchPaymentSchema.validate(invalidBatch).error;
      expect(error).toBeDefined();
    });

    it('should limit batch size', () => {
      const largeBatch = {
        payments: Array(101).fill(validBatch.payments[0]),
      };

      const error = batchPaymentSchema.validate(largeBatch).error;
      expect(error?.details?.[0]?.message).toBe('Maximum 100 payments allowed per batch');
    });
  });

  describe('webhookSchema', () => {
    const validWebhook = {
      payment_id: '123e4567-e89b-12d3-a456-426614174000',
      new_status: 'paid',
      reason: 'Payment completed',
    };

    it('should validate correct webhook data', () => {
      const result = webhookSchema.validate(validWebhook);
      expect(result.error).toBeUndefined();
    });

    it('should require payment_id', () => {
      const invalidWebhook = { ...validWebhook };
      invalidWebhook.payment_id = undefined as any;

      const error = webhookSchema.validate(invalidWebhook).error;
      expect(error?.details?.[0]?.message).toBe('Payment ID is required');
    });

    it('should validate payment_id format', () => {
      const invalidWebhook = { ...validWebhook };
      invalidWebhook.payment_id = 'invalid-uuid';

      const error = webhookSchema.validate(invalidWebhook).error;
      expect(error?.details?.[0]?.message).toBe('Payment ID must be a valid UUID');
    });

    it('should require new_status', () => {
      const invalidWebhook = { ...validWebhook };
      invalidWebhook.new_status = undefined as any;

      const error = webhookSchema.validate(invalidWebhook).error;
      expect(error?.details?.[0]?.message).toBe('New status is required');
    });

    it('should validate new_status values', () => {
      const invalidWebhook = { ...validWebhook };
      invalidWebhook.new_status = 'pending';

      const error = webhookSchema.validate(invalidWebhook).error;
      expect(error?.details?.[0]?.message).toBe('New status must be either paid or reversed');
    });

    it('should make reason optional', () => {
      const webhookWithoutReason = { ...validWebhook };
      webhookWithoutReason.reason = undefined as any;

      const result = webhookSchema.validate(webhookWithoutReason);
      expect(result.error).toBeUndefined();
    });

    it('should validate reason type when provided', () => {
      const invalidWebhook = { ...validWebhook };
      invalidWebhook.reason = 123 as any;

      const error = webhookSchema.validate(invalidWebhook).error;
      expect(error?.details?.[0]?.message).toBe('Reason must be a string');
    });
  });

  describe('listPaymentsSchema', () => {
    const validQuery = {
      status: 'pending',
      limit: 20,
      cursor: 'cursor-123',
    };

    it('should validate correct query data', () => {
      const result = listPaymentsSchema.validate(validQuery);
      expect(result.error).toBeUndefined();
    });

    it('should validate status values', () => {
      const invalidQuery = { ...validQuery };
      invalidQuery.status = 'invalid-status';

      const error = listPaymentsSchema.validate(invalidQuery).error;
      expect(error?.details?.[0]?.message).toBe('Status must be one of: pending, paid, reversed');
    });

    it('should validate limit constraints', () => {
      const invalidQuery = { ...validQuery };
      invalidQuery.limit = 'not-a-number' as any;

      const typeError = listPaymentsSchema.validate(invalidQuery).error;
      expect(typeError?.details?.[0]?.message).toBe('Limit must be a number');

      const lowError = listPaymentsSchema.validate({
        ...validQuery,
        limit: 0,
      }).error;
      expect(lowError?.details?.[0]?.message).toBe('Limit must be at least 1');

      const highError = listPaymentsSchema.validate({
        ...validQuery,
        limit: 101,
      }).error;
      expect(highError?.details?.[0]?.message).toBe('Limit cannot exceed 100');
    });

    it('should validate cursor format', () => {
      const invalidQuery = { ...validQuery };
      invalidQuery.cursor = 123 as any;

      const error = listPaymentsSchema.validate(invalidQuery).error;
      expect(error?.details?.[0]?.message).toBe('Cursor must be a string');
    });

    it('should make all fields optional', () => {
      const emptyQuery = {};
      const result = listPaymentsSchema.validate(emptyQuery);
      expect(result.error).toBeUndefined();
    });
  });
});
