import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Configuración y logging
import { appConfig } from './config/config';
import { logger } from './config/logger';
import { connectDatabase, closeDatabase, checkDatabaseHealth } from './config/database';
import { getMetrics } from './config/metrics';

// Middleware personalizado
import { 
  httpLoggingMiddleware, 
  errorLoggingMiddleware, 
  slowRequestLoggingMiddleware,
  LoggedRequest 
} from './middleware/logging';

// Modelos y servicios
import { setupAssociations } from './models';
import { PaymentService } from './services/PaymentService';
import { BatchPaymentService } from './services/BatchPaymentService';
import { PaymentController } from './controllers/PaymentController';
import { BatchPaymentController } from './controllers/BatchPaymentController';
import { WebhookController } from './controllers/WebhookController';

// Rutas
import { createPaymentRoutes } from './routes/paymentRoutes';
import { createWebhookRoutes } from './routes/webhookRoutes';

// Crear aplicación Express
const app = express();

// Middleware de logging HTTP
app.use(httpLoggingMiddleware);

// Middleware de requests lentos
app.use(slowRequestLoggingMiddleware);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Configuración de CORS
app.use(cors({
  origin: appConfig.cors.origin === '*' ? true : appConfig.cors.origin,
  credentials: appConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Idempotency-Key',
    'X-Webhook-Token',
    'X-Correlation-ID',
  ],
}));

// Middleware de parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Verificar que el JSON sea válido
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      res.status(400).json({
        error: 'Invalid JSON',
        details: ['The request body contains invalid JSON'],
      });
      throw new Error('Invalid JSON');
    }
  },
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting mejorado
const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Rate limit exceeded',
      details: [message],
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
      });
      res.status(429).json({
        error: 'Rate limit exceeded',
        details: [message],
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Aplicar rate limiting
app.use('/api/', createRateLimiter(
  appConfig.rateLimit.windowMs,
  appConfig.rateLimit.max,
  'Too many requests from this IP'
));

// Rate limiting más estricto para endpoints críticos
app.use('/api/v1/payments/batch', createRateLimiter(
  1 * 60 * 1000, // 1 minuto
  100, // máximo 100 requests por minuto
  'Batch processing rate limit exceeded'
));

app.use('/api/v1/webhooks/', createRateLimiter(
  5 * 60 * 1000, // 5 minutos
  20, // máximo 20 webhooks por 5 minutos
  'Webhook rate limit exceeded'
));

// Health check mejorado
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const memUsage = process.memoryUsage();
    
    const healthStatus = {
      status: dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.nodeEnv,
      version: process.env['npm_package_version'] || '1.0.0',
      database: dbHealth,
      system: {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
          external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
        },
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      features: {
        batchProcessing: appConfig.features.batchProcessing,
        webhooks: appConfig.features.webhooks,
        idempotency: appConfig.features.idempotency,
        metrics: appConfig.monitoring.enableMetrics,
      },
    };

    const statusCode = healthStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
    logger.info('Health check executed', {
      status: healthStatus.status,
      databaseStatus: dbHealth.status,
      uptime: healthStatus.uptime,
    });
    
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: [error instanceof Error ? error.message : 'Unknown error'],
    });
  }
});

// Endpoint de métricas para Prometheus
if (appConfig.monitoring.enableMetrics) {
  app.get('/metrics', async (req, res) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      logger.error('Failed to generate metrics', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({
        error: 'Failed to generate metrics',
        details: [error instanceof Error ? error.message : 'Unknown error'],
      });
    }
  });
}

// API routes
app.use('/api/v1/payments', (() => {
  const paymentService = new PaymentService();
  const batchPaymentService = new BatchPaymentService(paymentService);
  const paymentController = new PaymentController(paymentService);
  const batchPaymentController = new BatchPaymentController(batchPaymentService);
  
  return createPaymentRoutes(paymentController, batchPaymentController);
})());

app.use('/api/v1/webhooks', (() => {
  const paymentService = new PaymentService();
  const webhookController = new WebhookController(paymentService);
  
  return createWebhookRoutes(webhookController);
})());

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Endpoint not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  
  res.status(404).json({
    error: 'Endpoint not found',
    details: [`${req.method} ${req.originalUrl} is not a valid endpoint`],
    timestamp: new Date().toISOString(),
  });
});

// Middleware de manejo de errores
app.use(errorLoggingMiddleware);

// Global error handler mejorado
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error in application', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });
  
  // Clasificar errores
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let details = ['An unexpected error occurred'];
  
  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorMessage = 'Validation failed';
    details = error.errors.map((e: any) => e.message);
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorMessage = 'Resource already exists';
    details = ['The requested resource conflicts with existing data'];
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorMessage = 'Invalid reference';
    details = ['The referenced resource does not exist'];
  } else if (error.name === 'TimeoutError') {
    statusCode = 408;
    errorMessage = 'Request timeout';
    details = ['The request took too long to process'];
  }
  
  // En producción, no enviar stack trace
  const response: any = {
    error: errorMessage,
    details,
    timestamp: new Date().toISOString(),
  };
  
  if (appConfig.isDevelopment) {
    response.stack = error.stack;
    response.name = error.name;
  }
  
  res.status(statusCode).json(response);
});

// Función para iniciar el servidor
async function startServer() {
  try {
    logger.info('🚀 Iniciando servidor HIBE AI...', {
      environment: appConfig.nodeEnv,
      port: appConfig.port,
      features: appConfig.features,
    });

    // Setup de asociaciones de base de datos
    setupAssociations();
    logger.info('✅ Asociaciones de base de datos configuradas');
    
    // Conectar a la base de datos
    await connectDatabase();
    
    // Iniciar servidor
    const server = app.listen(appConfig.port, () => {
      logger.info('🚀 Servidor ejecutándose exitosamente', {
        port: appConfig.port,
        environment: appConfig.nodeEnv,
        healthCheck: `http://localhost:${appConfig.port}/health`,
        apiEndpoints: `http://localhost:${appConfig.port}/api/v1/`,
        metrics: appConfig.monitoring.enableMetrics 
          ? `http://localhost:${appConfig.port}/metrics`
          : 'disabled',
      });
    });

    // Configurar timeouts del servidor
    server.timeout = appConfig.timeouts.response;
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos

    // Manejo de errores del servidor
    server.on('error', (error: any) => {
      logger.error('❌ Error del servidor', {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });
      
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Puerto ${appConfig.port} ya está en uso`);
        process.exit(1);
      }
    });

    // Manejo de conexiones
    server.on('connection', (socket) => {
      logger.debug('🔌 Nueva conexión establecida', {
        remoteAddress: socket.remoteAddress,
        remotePort: socket.remotePort,
      });
    });

  } catch (error) {
    logger.error('❌ Falló al iniciar el servidor', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`🛑 Señal ${signal} recibida, cerrando servidor gracefulmente...`);
  
  try {
    // Cerrar conexión de base de datos
    await closeDatabase();
    logger.info('✅ Conexión de base de datos cerrada');
    
    // Salir del proceso
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error durante el shutdown graceful', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
};

// Manejar señales de terminación
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('❌ Excepción no capturada', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Promesa rechazada no manejada', {
    reason: reason instanceof Error ? reason.message : reason,
  });
  process.exit(1);
});

// Iniciar el servidor
startServer();
