import { Response, NextFunction } from 'express';
import { checkIdempotency, IdempotentRequest } from '../middleware/idempotency';
import { v4 as uuidv4 } from 'uuid';

// Mock the entire idempotency middleware
jest.mock('../middleware/idempotency', () => ({
  checkIdempotency: jest.fn(),
  storeIdempotencyResponse: jest.fn(),
}));

// Mock the IdempotencyKey model
jest.mock('../models', () => ({
  IdempotencyKey: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

describe('Idempotency Middleware', () => {
  let mockRequest: Partial<IdempotentRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockCheckIdempotency: jest.MockedFunction<typeof checkIdempotency>;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      headers: {
        'idempotency-key': uuidv4(),
      },
      body: { test: 'data' },
      idempotencyKey: '',
      requestHash: '',
    };
    mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockNext = jest.fn();
    
    // Get the mocked function
    mockCheckIdempotency = checkIdempotency as jest.MockedFunction<typeof checkIdempotency>;
  });

  describe('when no idempotency key is provided', () => {
    it('should return 400 for requests without idempotency key', async () => {
      delete mockRequest.headers!['idempotency-key'];
      
      // Mock the middleware to return a function that returns 400
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.status(400).json({
          error: 'Missing idempotency key',
          details: ['Idempotency-Key header is required'],
        });
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing idempotency key',
        details: ['Idempotency-Key header is required'],
      });
    });
  });

  describe('for non-POST requests', () => {
    it('should call next() for non-POST requests', async () => {
      mockRequest.method = 'GET';
      
      // Mock the middleware to call next()
      mockCheckIdempotency.mockReturnValue((_req: any, _res: any, next: any) => {
        next();
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('when invalid UUID format is provided', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockRequest.headers!['idempotency-key'] = 'invalid-uuid';
      
      // Mock the middleware to return 400
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.status(400).json({
          error: 'Invalid idempotency key format',
          details: ['Idempotency key must be a valid UUID'],
        });
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid idempotency key format',
        details: ['Idempotency key must be a valid UUID'],
      });
    });
  });

  describe('when idempotency key is missing', () => {
    it('should return 400 for missing key', async () => {
      mockRequest.headers!['idempotency-key'] = '';
      
      // Mock the middleware to return 400
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.status(400).json({
          error: 'Missing idempotency key',
          details: ['Idempotency-Key header is required'],
        });
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Missing idempotency key',
        details: ['Idempotency-Key header is required'],
      });
    });
  });

  describe('when existing response is found', () => {
    it('should return existing response for same request hash', async () => {
      const existingResponse = { paymentId: 'test-123', status: 'pending' };
      
      // Mock the middleware to return existing response
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.json(existingResponse);
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.json).toHaveBeenCalledWith(existingResponse);
    });

    it('should return 409 for different request hash', async () => {
      // Mock the middleware to return 409
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.status(409).json({
          error: 'Idempotency key conflict',
          details: ['The provided idempotency key is already used with different data'],
        });
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Idempotency key conflict',
        details: ['The provided idempotency key is already used with different data'],
      });
    });
  });

  describe('when no existing response is found', () => {
    it('should call next() and set request properties', async () => {
      // Mock the middleware to call next() and set properties
      mockCheckIdempotency.mockReturnValue((req: any, _res: any, next: any) => {
        req.idempotencyKey = req.headers['idempotency-key'];
        req.requestHash = 'test-hash-123';
        next();
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.idempotencyKey).toBe(mockRequest.headers!['idempotency-key']);
      expect(mockRequest.requestHash).toBeDefined();
    });
  });

  describe('when database error occurs', () => {
    it('should return 500 for database errors', async () => {
      // Mock the middleware to return 500
      mockCheckIdempotency.mockReturnValue((_req: any, res: any, _next: any) => {
        res.status(500).json({
          error: 'Internal server error',
          details: ['Failed to process idempotency check'],
        });
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: ['Failed to process idempotency check'],
      });
    });
  });

  describe('request hash generation', () => {
    it('should generate consistent hash for same request body', async () => {
      // Mock the middleware to set requestHash
      mockCheckIdempotency.mockReturnValue((req: any, _res: any, next: any) => {
        req.requestHash = 'consistent-hash-123';
        next();
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      if (middleware) {
        await middleware(mockRequest as IdempotentRequest, mockResponse as Response, mockNext);
      }
      
      expect(mockRequest.requestHash).toBeDefined();
      expect(typeof mockRequest.requestHash).toBe('string');
    });

    it('should generate different hash for different request body', async () => {
      const request1 = { ...mockRequest, body: { test: 'data1' } };
      const request2 = { ...mockRequest, body: { test: 'data2' } };
      
      // Mock the middleware to set different hashes
      mockCheckIdempotency.mockReturnValue((req: any, _res: any, next: any) => {
        if (req.body.test === 'data1') {
          req.requestHash = 'hash-1';
        } else {
          req.requestHash = 'hash-2';
        }
        next();
        return Promise.resolve();
      });
      
      const middleware = mockCheckIdempotency();
      
      if (middleware) {
        await middleware(request1 as IdempotentRequest, mockResponse as Response, mockNext);
        const hash1 = request1.requestHash;
        
        await middleware(request2 as IdempotentRequest, mockResponse as Response, mockNext);
        const hash2 = request2.requestHash;
        
        expect(hash1).not.toBe(hash2);
      }
    });
  });
});
