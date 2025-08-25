import winston from 'winston';
import path from 'path';

// Custom log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  audit: 5,
};

// Custom colors for development
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  audit: 'cyan',
};

winston.addColors(colors);

// Development format
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

// Production format (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env['LOG_LEVEL'] || 'info',
  format: process.env['NODE_ENV'] === 'production' ? productionFormat : developmentFormat,
  transports: [
    new winston.transports.Console({
      format: process.env['NODE_ENV'] === 'production' ? productionFormat : developmentFormat,
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

// HTTP-specific logger
export const httpLogger = winston.createLogger({
  levels: logLevels,
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'http.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Audit logger for business events
export const auditLogger = winston.createLogger({
  levels: logLevels,
  level: 'audit',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'audit.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Helper function to log with context
export const logWithContext = (level: keyof typeof logLevels, message: string, context: Record<string, any> = {}) => {
  logger.log(level, message, context);
};

// Helper function to log audit events
export const logAuditEvent = (event: string, userId?: string, details: Record<string, any> = {}) => {
  auditLogger.log('audit', event, {
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

// Helper function to log HTTP requests
export const logHttpRequest = (method: string, url: string, statusCode: number, responseTime: number, ip?: string, userAgent?: string) => {
  httpLogger.log('http', `${method} ${url}`, {
    statusCode,
    responseTime,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });
};

// Helper function to sanitize sensitive data
export const sanitizeHeaders = (headers: Record<string, any>): Record<string, any> => {
  const sanitized = { ...headers };
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-webhook-token'];
  
  sensitiveKeys.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

// Helper function to get client IP
export const getClientIP = (req: any): string => {
  return req.headers['x-forwarded-for'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip || 
         'unknown';
};

// Helper function to get user agent
export const getUserAgent = (req: any): string => {
  return req.headers['user-agent'] || 'unknown';
};
