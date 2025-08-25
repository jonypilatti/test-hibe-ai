import { Request, Response, NextFunction } from 'express';
import { httpLogger, logAudit } from '../config/logger';
import { recordHttpRequest } from '../config/metrics';
import { appConfig } from '../config/config';

// Interfaz extendida para Request con información adicional
export interface LoggedRequest extends Request {
  requestId?: string;
  startTime?: number;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
}

// Función para generar ID único de request
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Función para obtener IP real del cliente
const getClientIP = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// Función para sanitizar headers sensibles
const sanitizeHeaders = (headers: Record<string, any>): Record<string, any> => {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-webhook-token',
    'idempotency-key',
  ];
  
  const sanitized = { ...headers };
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Función para determinar si un request debe ser auditado
const shouldAuditRequest = (req: Request): boolean => {
  const auditEndpoints = [
    '/api/v1/payments',
    '/api/v1/payments/batch',
    '/api/v1/webhooks/simulate',
  ];
  
  return auditEndpoints.some(endpoint => 
    req.path.startsWith(endpoint) && req.method !== 'GET'
  );
};

// Middleware principal de logging
export const httpLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Crear objeto separado para información adicional
  const requestInfo = {
    requestId: generateRequestId(),
    startTime: Date.now(),
    userAgent: req.get('User-Agent') || 'unknown',
    ip: getClientIP(req),
    correlationId: req.headers['x-correlation-id'] as string || generateRequestId(),
  };

  // Log del request entrante
  httpLogger.http('Incoming HTTP request', {
    requestId: requestInfo.requestId,
    correlationId: requestInfo.correlationId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    headers: sanitizeHeaders(req.headers),
    userAgent: requestInfo.userAgent,
    ip: requestInfo.ip,
    timestamp: new Date().toISOString(),
  });

  // Interceptar la respuesta para logging
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - requestInfo.startTime;
    const statusCode = res.statusCode;
    
    // Log de la respuesta
    httpLogger.http('HTTP response sent', {
      requestId: requestInfo.requestId,
      correlationId: requestInfo.correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      statusCode,
      duration,
      contentLength: data ? JSON.stringify(data).length : 0,
      timestamp: new Date().toISOString(),
    });

    // Registrar métricas
    if (appConfig.monitoring.enableMetrics) {
      recordHttpRequest(
        req.method,
        req.path,
        statusCode,
        duration,
        req.originalUrl || req.url
      );
    }

    // Log de auditoría para endpoints críticos
    if (shouldAuditRequest(req)) {
      const auditDetails = {
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        ip: requestInfo.ip,
        userAgent: requestInfo.userAgent,
        requestId: requestInfo.requestId,
        correlationId: requestInfo.correlationId,
        body: req.method !== 'GET' ? req.body : undefined,
        query: Object.keys(req.query).length > 0 ? req.query : undefined,
      };

      logAudit(
        `${req.method} ${req.path}`,
        undefined, // userId - implementar cuando se agregue autenticación
        requestInfo.requestId,
        auditDetails
      );
    }

    // Log de errores
    if (statusCode >= 400) {
      const logLevel = statusCode >= 500 ? 'error' : 'warn';
      httpLogger[logLevel]('HTTP error response', {
        requestId: requestInfo.requestId,
        correlationId: requestInfo.correlationId,
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.path,
        statusCode,
        duration,
        error: data?.error || 'Unknown error',
        details: data?.details || [],
        timestamp: new Date().toISOString(),
      });
    }

    // Llamar al método original
    originalSend.call(this, data);
  };

  // Interceptar errores
  const originalJson = res.json;
  res.json = function(data: any) {
    const duration = Date.now() - (requestInfo.startTime || 0);
    
    // Log de respuesta JSON
    httpLogger.http('JSON response sent', {
      requestId: requestInfo.requestId,
      correlationId: requestInfo.correlationId,
      method: req.method,
      url: req.originalUrl || req.url,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: data ? JSON.stringify(data).length : 0,
      timestamp: new Date().toISOString(),
    });

    originalJson.call(this, data);
  };

  next();
};

// Middleware para logging de errores no capturados
export const errorLoggingMiddleware = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const loggedReq = req as LoggedRequest;
  const duration = loggedReq.startTime ? Date.now() - loggedReq.startTime : 0;
  
  httpLogger.error('Unhandled error in HTTP request', {
    requestId: loggedReq.requestId,
    correlationId: loggedReq.correlationId,
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    duration,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    timestamp: new Date().toISOString(),
  });

  next(error);
};

// Middleware para logging de requests lentos
export const slowRequestLoggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const loggedReq = req as LoggedRequest;
  const slowRequestThreshold = 5000; // 5 segundos
  
  const checkSlowRequest = () => {
    if (loggedReq.startTime) {
      const duration = Date.now() - loggedReq.startTime;
      if (duration > slowRequestThreshold) {
        httpLogger.warn('Slow HTTP request detected', {
          requestId: loggedReq.requestId,
          correlationId: loggedReq.correlationId,
          method: req.method,
          url: req.originalUrl || req.url,
          path: req.path,
          duration,
          threshold: slowRequestThreshold,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  // Verificar al final del request
  res.on('finish', checkSlowRequest);
  res.on('close', checkSlowRequest);

  next();
};

// Función para obtener contexto del request actual
export const getRequestContext = (req: LoggedRequest) => ({
  requestId: req.requestId,
  correlationId: req.correlationId,
  method: req.method,
  path: req.path,
  ip: req.ip,
  userAgent: req.userAgent,
});

// Función para logging de operaciones de negocio
export const logBusinessOperation = (
  operation: string,
  req: LoggedRequest,
  details: Record<string, any> = {}
) => {
  httpLogger.info('Business operation executed', {
    operation,
    ...getRequestContext(req),
    details,
    timestamp: new Date().toISOString(),
  });
};
