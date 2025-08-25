import Joi from 'joi';
import dotenv from 'dotenv';
import { logger } from './logger';

// Cargar variables de entorno
dotenv.config();

// Esquema de validación para la configuración
const configSchema = Joi.object({
  // Configuración del servidor
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  
  // Configuración de la base de datos
  DB_PATH: Joi.string().required(),
  DB_LOGGING: Joi.boolean().default(false),
  DB_POOL_MAX: Joi.number().min(1).max(20).default(5),
  DB_POOL_MIN: Joi.number().min(0).max(10).default(0),
  DB_POOL_ACQUIRE: Joi.number().min(1000).max(60000).default(30000),
  DB_POOL_IDLE: Joi.number().min(1000).max(60000).default(10000),
  
  // Seguridad
  WEBHOOK_TOKEN: Joi.string().min(32).required(),
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().min(1000).max(3600000).default(900000), // 15 min
  RATE_LIMIT_MAX_REQUESTS: Joi.number().min(10).max(1000).default(100),
  
  // Procesamiento por lotes
  BATCH_MAX_CONCURRENT_WORKERS: Joi.number().min(1).max(20).default(5),
  BATCH_RETRY_ATTEMPTS: Joi.number().min(1).max(10).default(3),
  BATCH_RETRY_DELAY_MS: Joi.number().min(100).max(10000).default(1000),
  
  // URLs y endpoints
  CHECKOUT_BASE_URL: Joi.string().uri().required(),
  API_BASE_URL: Joi.string().uri().default('http://localhost:3000'),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'debug')
    .default('info'),
  LOG_FILE_MAX_SIZE: Joi.number().min(1024 * 1024).max(100 * 1024 * 1024).default(5 * 1024 * 1024), // 5MB
  LOG_FILE_MAX_FILES: Joi.number().min(1).max(50).default(5),
  
  // Caching (para futuras implementaciones)
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_TTL: Joi.number().min(60).max(86400).default(3600), // 1 hora
  
  // Monitoreo y métricas
  ENABLE_METRICS: Joi.boolean().default(true),
  METRICS_PORT: Joi.number().port().default(9090),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.boolean().default(false),
  
  // Timeouts
  REQUEST_TIMEOUT: Joi.number().min(1000).max(30000).default(10000),
  RESPONSE_TIMEOUT: Joi.number().min(1000).max(30000).default(10000),
  
  // Feature flags
  ENABLE_BATCH_PROCESSING: Joi.boolean().default(true),
  ENABLE_WEBHOOKS: Joi.boolean().default(true),
  ENABLE_IDEMPOTENCY: Joi.boolean().default(true),
  
  // Alertas y notificaciones
  SLACK_WEBHOOK_URL: Joi.string().uri().optional(),
  EMAIL_SMTP_HOST: Joi.string().optional(),
  EMAIL_SMTP_PORT: Joi.number().port().optional(),
  EMAIL_SMTP_USER: Joi.string().optional(),
  EMAIL_SMTP_PASS: Joi.string().optional(),
});

// Validar y cargar configuración
const { error, value: config } = configSchema.validate(process.env, {
  abortEarly: false,
  stripUnknown: true,
});

if (error) {
  const errorMessage = `❌ Error de configuración: ${error.details.map(d => d.message).join(', ')}`;
  logger.error(errorMessage);
  throw new Error(errorMessage);
}

// Configuración validada
export const appConfig = {
  // Servidor
  nodeEnv: config.NODE_ENV,
  port: config.PORT,
  
  // Base de datos
  database: {
    path: config.DB_PATH,
    logging: config.DB_LOGGING,
    pool: {
      max: config.DB_POOL_MAX,
      min: config.DB_POOL_MIN,
      acquire: config.DB_POOL_ACQUIRE,
      idle: config.DB_POOL_IDLE,
    },
  },
  
  // Seguridad
  security: {
    webhookToken: config.WEBHOOK_TOKEN,
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
  },
  
  // Procesamiento por lotes
  batch: {
    maxConcurrentWorkers: config.BATCH_MAX_CONCURRENT_WORKERS,
    retryAttempts: config.BATCH_RETRY_ATTEMPTS,
    retryDelayMs: config.BATCH_RETRY_DELAY_MS,
  },
  
  // URLs
  urls: {
    checkoutBase: config.CHECKOUT_BASE_URL,
    apiBase: config.API_BASE_URL,
  },
  
  // Logging
  logging: {
    level: config.LOG_LEVEL,
    fileMaxSize: config.LOG_FILE_MAX_SIZE,
    fileMaxFiles: config.LOG_FILE_MAX_FILES,
  },
  
  // Caching
  cache: {
    redisUrl: config.REDIS_URL,
    redisTtl: config.REDIS_TTL,
  },
  
  // Monitoreo
  monitoring: {
    enableMetrics: config.ENABLE_METRICS,
    metricsPort: config.METRICS_PORT,
  },
  
  // CORS
  cors: {
    origin: config.CORS_ORIGIN,
    credentials: config.CORS_CREDENTIALS,
  },
  
  // Timeouts
  timeouts: {
    request: config.REQUEST_TIMEOUT,
    response: config.RESPONSE_TIMEOUT,
  },
  
  // Feature flags
  features: {
    batchProcessing: config.ENABLE_BATCH_PROCESSING,
    webhooks: config.ENABLE_WEBHOOKS,
    idempotency: config.ENABLE_IDEMPOTENCY,
  },
  
  // Notificaciones
  notifications: {
    slack: config.SLACK_WEBHOOK_URL,
    email: {
      smtpHost: config.EMAIL_SMTP_HOST,
      smtpPort: config.EMAIL_SMTP_PORT,
      smtpUser: config.EMAIL_SMTP_USER,
      smtpPass: config.EMAIL_SMTP_PASS,
    },
  },
  
  // Utilidades
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isTest: config.NODE_ENV === 'test',
};

// Log de configuración cargada
logger.info('✅ Configuración cargada exitosamente', {
  environment: appConfig.nodeEnv,
  port: appConfig.port,
  features: {
    batchProcessing: appConfig.features.batchProcessing,
    webhooks: appConfig.features.webhooks,
    idempotency: appConfig.features.idempotency,
  },
});

export default appConfig;
