import { v4 as uuidv4 } from 'uuid';
import { PaymentService, CreatePaymentRequest } from './PaymentService';
import { storeIdempotencyResponse } from '../middleware/idempotency';
import { appConfig } from '../config/config';

export interface BatchPaymentRequest {
  payments: CreatePaymentRequest[];
}

export interface BatchPaymentResult {
  index: number;
  paymentId?: string;
  status?: 'pending' | 'paid' | 'reversed';
  error?: {
    code: string;
    message: string;
  };
}

export interface BatchPaymentResponse {
  results: BatchPaymentResult[];
  failed: number;
  succeeded: number;
}

export interface BatchProcessingOptions {
  maxConcurrentWorkers: number;
  maxRetryAttempts: number;
  retryDelayMs: number;
}

export class BatchPaymentService {
  private paymentService: PaymentService;
  private options: BatchProcessingOptions;

  constructor(paymentService: PaymentService, options?: Partial<BatchProcessingOptions>) {
    this.paymentService = paymentService;
    this.options = {
      maxConcurrentWorkers: appConfig.batch.maxConcurrentWorkers,
      maxRetryAttempts: appConfig.batch.retryAttempts,
      retryDelayMs: appConfig.batch.retryDelayMs,
      ...options,
    };
  }

  async processBatch(
    request: BatchPaymentRequest,
    idempotencyKey: string,
    requestHash: string
  ): Promise<BatchPaymentResponse> {
    const { payments } = request;
    
    if (payments.length > 100) {
      throw new Error('Maximum 100 payments allowed per batch');
    }

    const results: BatchPaymentResult[] = [];
    let succeeded = 0;
    let failed = 0;

    // Process payments in chunks based on max concurrent workers
    for (let i = 0; i < payments.length; i += this.options.maxConcurrentWorkers) {
      const chunk = payments.slice(i, i + this.options.maxConcurrentWorkers);
      const chunkPromises = chunk.map((payment, chunkIndex) => 
        this.processPaymentWithRetry(payment, i + chunkIndex)
      );

      const chunkResults = await Promise.allSettled(chunkPromises);
      
      chunkResults.forEach((result, chunkIndex) => {
        const globalIndex = i + chunkIndex;
        if (result.status === 'fulfilled') {
          results[globalIndex] = result.value;
          if (result.value.error) {
            failed++;
          } else {
            succeeded++;
          }
        } else {
          results[globalIndex] = {
            index: globalIndex,
            error: {
              code: 'processing_error',
              message: result.reason?.message || 'Unknown error occurred',
            },
          };
          failed++;
        }
      });
    }

    const response: BatchPaymentResponse = {
      results,
      failed,
      succeeded,
    };

    // Store response for idempotency
    await storeIdempotencyResponse(idempotencyKey, requestHash, response);

    return response;
  }

  private async processPaymentWithRetry(
    payment: CreatePaymentRequest,
    index: number
  ): Promise<BatchPaymentResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetryAttempts; attempt++) {
      try {
        // Generate unique idempotency key for each payment in batch
        const paymentIdempotencyKey = `${uuidv4()}-${index}`;
        const requestHash = 'batch-payment'; // Simplified for batch processing

        const result = await this.paymentService.createPayment(
          payment,
          paymentIdempotencyKey,
          requestHash
        );

        return {
          index,
          paymentId: result.paymentId,
          status: result.status,
        };
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.options.maxRetryAttempts) {
          // Wait before retry
          await this.delay(this.options.retryDelayMs * attempt); // Exponential backoff
        }
      }
    }

    // All retry attempts failed
    return {
      index,
      error: {
        code: 'max_retries_exceeded',
        message: lastError?.message || 'Payment processing failed after all retry attempts',
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
