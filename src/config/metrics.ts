import prometheus from 'prom-client';
import { logger } from './logger';
import { appConfig } from './config';

// Configurar Prometheus
prometheus.collectDefaultMetrics({
  prefix: 'hibe_ai_',
  labels: {
    app: 'hibe-ai',
    environment: appConfig.nodeEnv,
  },
});

// Métricas personalizadas
export const metrics = {
  // Contador de requests HTTP
  httpRequestsTotal: new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'endpoint'],
  }),

  // Histograma de duración de requests
  httpRequestDurationSeconds: new prometheus.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  }),

  // Contador de errores
  httpErrorsTotal: new prometheus.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'error_type', 'endpoint', 'status_code'],
  }),

  // Métricas de base de datos
  databaseQueriesTotal: new prometheus.Counter({
    name: 'database_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'status'],
  }),

  databaseQueryDurationSeconds: new prometheus.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  }),

  // Métricas de pagos
  paymentsCreatedTotal: new prometheus.Counter({
    name: 'payments_created_total',
    help: 'Total number of payments created',
    labelNames: ['currency', 'status'],
  }),

  paymentsProcessedTotal: new prometheus.Counter({
    name: 'payments_processed_total',
    help: 'Total number of payments processed',
    labelNames: ['status', 'batch_size'],
  }),

  batchProcessingDurationSeconds: new prometheus.Histogram({
    name: 'batch_processing_duration_seconds',
    help: 'Duration of batch processing in seconds',
    labelNames: ['batch_size'],
    buckets: [1, 5, 10, 30, 60, 120, 300],
  }),

  // Métricas de webhooks
  webhookRequestsTotal: new prometheus.Counter({
    name: 'webhook_requests_total',
    help: 'Total number of webhook requests',
    labelNames: ['status', 'payment_status'],
  }),

  // Métricas de idempotencia
  idempotencyCacheHits: new prometheus.Counter({
    name: 'idempotency_cache_hits_total',
    help: 'Total number of idempotency cache hits',
  }),

  idempotencyCacheMisses: new prometheus.Counter({
    name: 'idempotency_cache_misses_total',
    help: 'Total number of idempotency cache misses',
  }),

  // Métricas de memoria y sistema
  memoryUsageBytes: new prometheus.Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type'],
  }),

  activeConnections: new prometheus.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
  }),

  // Métricas de rate limiting
  rateLimitExceededTotal: new prometheus.Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total number of rate limit violations',
    labelNames: ['ip', 'endpoint'],
  }),
};

// Función para registrar métricas de request
export const recordHttpRequest = (
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  endpoint: string
) => {
  const labels = { method, route, status_code: statusCode.toString(), endpoint };
  
  metrics.httpRequestsTotal.inc(labels);
  metrics.httpRequestDurationSeconds.observe(
    { method, route, endpoint },
    duration / 1000
  );

  // Registrar errores
  if (statusCode >= 400) {
    const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
    metrics.httpErrorsTotal.inc({
      method,
      route,
      error_type: errorType,
      endpoint,
      status_code: statusCode.toString(),
    });
  }
};

// Función para registrar métricas de base de datos
export const recordDatabaseQuery = (
  operation: string,
  table: string,
  duration: number,
  status: 'success' | 'error'
) => {
  metrics.databaseQueriesTotal.inc({ operation, table, status });
  metrics.databaseQueryDurationSeconds.observe(
    { operation, table },
    duration / 1000
  );
};

// Función para registrar métricas de pagos
export const recordPaymentCreated = (currency: string, status: string) => {
  metrics.paymentsCreatedTotal.inc({ currency, status });
};

export const recordPaymentProcessed = (status: string, batchSize: number) => {
  metrics.paymentsProcessedTotal.inc({ status, batch_size: batchSize.toString() });
};

export const recordBatchProcessing = (batchSize: number, duration: number) => {
  metrics.batchProcessingDurationSeconds.observe(
    { batch_size: batchSize.toString() },
    duration / 1000
  );
};

// Función para registrar métricas de webhooks
export const recordWebhookRequest = (status: string, paymentStatus: string) => {
  metrics.webhookRequestsTotal.inc({ status, payment_status: paymentStatus });
};

// Función para registrar métricas de idempotencia
export const recordIdempotencyCacheHit = () => {
  metrics.idempotencyCacheHits.inc();
};

export const recordIdempotencyCacheMiss = () => {
  metrics.idempotencyCacheMisses.inc();
};

// Función para registrar métricas de rate limiting
export const recordRateLimitExceeded = (ip: string, endpoint: string) => {
  metrics.rateLimitExceededTotal.inc({ ip, endpoint });
};

// Función para actualizar métricas del sistema
export const updateSystemMetrics = () => {
  const memUsage = process.memoryUsage();
  
  metrics.memoryUsageBytes.set({ type: 'rss' }, memUsage.rss);
  metrics.memoryUsageBytes.set({ type: 'heapTotal' }, memUsage.heapTotal);
  metrics.memoryUsageBytes.set({ type: 'heapUsed' }, memUsage.heapUsed);
  metrics.memoryUsageBytes.set({ type: 'external' }, memUsage.external);
};

// Función para obtener métricas en formato Prometheus
export const getMetrics = async (): Promise<string> => {
  try {
    // Actualizar métricas del sistema
    updateSystemMetrics();
    
    // Obtener métricas en formato Prometheus
    const metricsData = await prometheus.register.metrics();
    
    logger.debug('📊 Métricas generadas exitosamente');
    return metricsData;
  } catch (error) {
    logger.error('❌ Error al generar métricas', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

// Función para resetear métricas (útil para testing)
export const resetMetrics = (): void => {
  prometheus.register.clear();
  logger.info('🔄 Métricas reseteadas');
};

// Middleware para registrar métricas automáticamente
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();
  const originalSend = res.send;
  
  // Interceptar la respuesta para registrar métricas
  res.send = function(data: any) {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path || 'unknown';
    const endpoint = req.originalUrl || req.url;
    
    recordHttpRequest(
      req.method,
      route,
      res.statusCode,
      duration,
      endpoint
    );
    
    originalSend.call(this, data);
  };
  
  next();
};

// Inicializar métricas
logger.info('📊 Sistema de métricas inicializado', {
  enabled: appConfig.monitoring.enableMetrics,
  port: appConfig.monitoring.metricsPort,
});
