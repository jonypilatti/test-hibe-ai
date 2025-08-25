import { Sequelize, Op } from 'sequelize';
import path from 'path';
import { appConfig } from './config';
import { logger } from './logger';

// Crear directorio de base de datos si no existe
const dbDir = path.dirname(appConfig.database.path);
import fs from 'fs';
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  logger.info(`📁 Directorio de base de datos creado: ${dbDir}`);
}

export const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: appConfig.database.path,
  logging: appConfig.database.logging ? (msg) => logger.debug(msg) : false,
  
  // Configuración de pool para SQLite (aunque SQLite no usa pool tradicional)
  pool: {
    max: appConfig.database.pool.max,
    min: appConfig.database.pool.min,
    acquire: appConfig.database.pool.acquire,
    idle: appConfig.database.pool.idle,
  },
  
  // Configuración general
  define: {
    timestamps: true,
    underscored: true,
    // Hooks para logging
    hooks: {
      beforeCreate: (instance: any) => {
        logger.debug('Creating new record', {
          model: instance.constructor.name,
          table: instance.constructor.tableName,
        });
      },
      beforeUpdate: (instance: any) => {
        logger.debug('Updating record', {
          model: instance.constructor.name,
          table: instance.constructor.tableName,
          id: instance.id,
        });
      },
      beforeDestroy: (instance: any) => {
        logger.debug('Deleting record', {
          model: instance.constructor.name,
          table: instance.constructor.tableName,
          id: instance.id,
        });
      },
    },
  },
  
  // Configuración de dialecto específica para SQLite
  dialectOptions: {
    // Habilitar foreign keys
    foreignKeys: true,
    // Configuración de journal mode para mejor performance
    journalMode: 'WAL',
    // Configuración de cache
    cache: 'shared',
    // Configuración de temp store
    tempStore: 'memory',
  },
  
  // Configuración de retry
  retry: {
    max: 3,
    match: [
      /Deadlock/i,
      /Connection lost/i,
      /Connection terminated/i,
    ],
  },
});

// Eventos de conexión
sequelize.addHook('beforeConnect', async (config: any) => {
  logger.debug('🔄 Intentando conectar a la base de datos...', {
    dialect: config.dialect,
    storage: config.storage,
  });
});

sequelize.addHook('afterConnect', async () => {
  logger.info('✅ Conexión a la base de datos establecida exitosamente');
});

// Eventos de error
sequelize.addHook('afterConnect', async () => {
  logger.info('✅ Conexión a la base de datos establecida exitosamente');
});

export const connectDatabase = async (): Promise<void> => {
  try {
    logger.info('🔄 Iniciando conexión a la base de datos...', {
      path: appConfig.database.path,
      environment: appConfig.nodeEnv,
    });

    // Verificar conexión
    await sequelize.authenticate();
    logger.info('✅ Autenticación de base de datos exitosa');
    
    // En desarrollo, sincronizar modelos
    if (appConfig.isDevelopment) {
      logger.info('🔄 Sincronizando modelos de base de datos...');
      await sequelize.sync({ force: true });
      logger.info('✅ Modelos de base de datos sincronizados');
    }
    
    // Verificar estado de la base de datos
    const [results] = await sequelize.query('PRAGMA integrity_check');
    if (results && Array.isArray(results) && results.length > 0) {
      const integrityCheck = results[0] as any;
      if (integrityCheck.integrity_check === 'ok') {
        logger.info('✅ Verificación de integridad de base de datos exitosa');
      } else {
        logger.warn('⚠️ Verificación de integridad de base de datos falló', {
          result: integrityCheck.integrity_check,
        });
      }
    }
    
    // Obtener estadísticas de la base de datos
    const [tableResults] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    if (tableResults && Array.isArray(tableResults)) {
      logger.info(`📊 Base de datos contiene ${tableResults.length} tablas`, {
        tables: tableResults.map((t: any) => t.name),
      });
    }
    
  } catch (error) {
    const errorMessage = '❌ No se pudo conectar a la base de datos';
    logger.error(errorMessage, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      path: appConfig.database.path,
    });
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Función para cerrar la conexión de manera limpia
export const closeDatabase = async (): Promise<void> => {
  try {
    logger.info('🔄 Cerrando conexión a la base de datos...');
    await sequelize.close();
    logger.info('✅ Conexión a la base de datos cerrada exitosamente');
  } catch (error) {
    logger.error('❌ Error al cerrar la conexión a la base de datos', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Función para verificar el estado de la base de datos
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  details: Record<string, any>;
}> => {
  try {
    // Verificar conexión
    await sequelize.authenticate();
    
    // Verificar integridad
    const [integrityResults] = await sequelize.query('PRAGMA integrity_check');
    const integrityCheck = Array.isArray(integrityResults) && integrityResults.length > 0 
      ? (integrityResults[0] as any).integrity_check 
      : 'unknown';
    
    // Obtener estadísticas
    const [tableResults] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableCount = Array.isArray(tableResults) ? tableResults.length : 0;
    
    // Verificar tamaño del archivo
    const stats = fs.statSync(appConfig.database.path);
    const fileSizeMB = Math.round(stats.size / (1024 * 1024) * 100) / 100;
    
    const isHealthy = integrityCheck === 'ok';
    
    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: {
        connection: 'connected',
        integrity: integrityCheck,
        tableCount,
        fileSizeMB,
        lastCheck: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        connection: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date().toISOString(),
      },
    };
  }
};

// Función para limpiar registros antiguos
export const cleanupOldRecords = async (): Promise<void> => {
  try {
    logger.info('🧹 Iniciando limpieza de registros antiguos...');
    
    // Limpiar claves de idempotencia expiradas
    const { IdempotencyKey } = await import('../models');
    const deletedKeys = await IdempotencyKey.destroy({
      where: {
        expiresAt: {
          [Op.lt]: new Date(),
        },
      },
    });
    
    if (deletedKeys > 0) {
      logger.info(`🗑️ Limpiados ${deletedKeys} registros de idempotencia expirados`);
    }
    
    logger.info('✅ Limpieza de registros antiguos completada');
  } catch (error) {
    logger.error('❌ Error durante la limpieza de registros antiguos', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
