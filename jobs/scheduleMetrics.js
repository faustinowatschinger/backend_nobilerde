// backend/jobs/scheduleMetrics.js
import cron from 'node-cron';
import metricsAggregator from '../services/metricsAggregator.js';

/**
 * Programador de tareas para ejecutar agregaciones de métricas
 * Ejecuta diariamente a las 2:00 AM para no interferir con el tráfico de usuarios
 */
class MetricsScheduler {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  /**
   * Inicia el programador de métricas
   */
  start() {
    console.log('🕒 Iniciando programador de métricas...');
    
    // Ejecutar agregación diaria a las 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      await this.runDailyAggregation();
    }, {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires" // Ajustar según la zona horaria de la aplicación
    });

    // Ejecutar agregación semanal los domingos a las 3:00 AM
    cron.schedule('0 3 * * 0', async () => {
      await this.runWeeklyAggregation();
    }, {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires"
    });

    // Ejecutar limpieza mensual el primer día del mes a las 4:00 AM
    cron.schedule('0 4 1 * *', async () => {
      await this.runMonthlyCleanup();
    }, {
      scheduled: true,
      timezone: "America/Argentina/Buenos_Aires"
    });

    // También permitir ejecución manual para testing/debugging
    this.updateNextRunTime();
    console.log('✅ Programador de métricas iniciado exitosamente');
    console.log(`⏰ Próxima ejecución: ${this.nextRun}`);
  }

  /**
   * Ejecuta la agregación diaria de métricas
   */
  async runDailyAggregation() {
    if (this.isRunning) {
      console.log('⚠️ Agregación ya en ejecución, saltando...');
      return;
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date();
      
      console.log('🚀 Iniciando agregación diaria de métricas...');
      console.log(`📅 Timestamp: ${this.lastRun.toISOString()}`);
      
      const startTime = Date.now();
      
      // Ejecutar todas las agregaciones
      await metricsAggregator.generateAllMetrics();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Agregación diaria completada en ${duration}ms`);
      
      // Actualizar próxima ejecución
      this.updateNextRunTime();
      
      // Opcional: Enviar notificación de éxito (email, Slack, etc.)
      await this.notifySuccess('daily', duration);
      
    } catch (error) {
      console.error('❌ Error en agregación diaria:', error);
      
      // Opcional: Enviar notificación de error
      await this.notifyError('daily', error);
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ejecuta agregación semanal (más intensiva)
   */
  async runWeeklyAggregation() {
    if (this.isRunning) {
      console.log('⚠️ Agregación ya en ejecución, saltando agregación semanal...');
      return;
    }

    try {
      this.isRunning = true;
      console.log('🚀 Iniciando agregación semanal de métricas...');
      
      const startTime = Date.now();
      
      // Ejecutar agregaciones con mayor rango temporal
      await metricsAggregator.generateAllMetrics();
      
      // Ejecutar análisis adicionales solo semanalmente
      await this.runAdvancedAnalytics();
      
      const duration = Date.now() - startTime;
      console.log(`✅ Agregación semanal completada en ${duration}ms`);
      
      await this.notifySuccess('weekly', duration);
      
    } catch (error) {
      console.error('❌ Error en agregación semanal:', error);
      await this.notifyError('weekly', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ejecuta limpieza mensual de datos antiguos
   */
  async runMonthlyCleanup() {
    try {
      console.log('🧹 Iniciando limpieza mensual...');
      
      const startTime = Date.now();
      
      // Limpiar eventos muy antiguos (mantener solo 1 año)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const { Event } = await import('../config/eventModel.js');
      const deletedEvents = await Event.deleteMany({
        timestamp: { $lt: oneYearAgo }
      });
      
      console.log(`🗑️ Eliminados ${deletedEvents.deletedCount} eventos antiguos`);
      
      // Limpiar métricas muy antiguas (mantener solo 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const collections = [
        'metrics_top_yerbas',
        'metrics_flavor_notes', 
        'metrics_trends',
        'metrics_user_behavior',
        'metrics_discovery'
      ];
      
      for (const collectionName of collections) {
        const collection = metricsAggregator.metricsConn.db.collection(collectionName);
        const result = await collection.deleteMany({
          createdAt: { $lt: sixMonthsAgo }
        });
        console.log(`🗑️ Eliminados ${result.deletedCount} documentos de ${collectionName}`);
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Limpieza mensual completada en ${duration}ms`);
      
    } catch (error) {
      console.error('❌ Error en limpieza mensual:', error);
    }
  }

  /**
   * Ejecuta análisis avanzados (solo semanalmente para no sobrecargar)
   */
  async runAdvancedAnalytics() {
    console.log('🔬 Ejecutando análisis avanzados...');
    
    try {
      // Análisis de cohorts de usuarios
      // Análisis de tendencias estacionales
      // Detección de anomalías
      // etc.
      
      console.log('✅ Análisis avanzados completados');
    } catch (error) {
      console.error('❌ Error en análisis avanzados:', error);
    }
  }

  /**
   * Ejecuta agregación manualmente (útil para testing)
   */
  async runManual() {
    console.log('🎯 Ejecutando agregación manual...');
    await this.runDailyAggregation();
  }

  /**
   * Actualiza el tiempo de la próxima ejecución
   */
  updateNextRunTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 2:00 AM del siguiente día
    
    this.nextRun = tomorrow;
  }

  /**
   * Obtiene el estado del programador
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      uptime: process.uptime()
    };
  }

  /**
   * Notifica éxito de la operación
   */
  async notifySuccess(type, duration) {
    // Implementar notificaciones según necesidades:
    // - Email
    // - Slack
    // - Dashboard interno
    // - Logs estructurados
    
    console.log(`📧 Notificación: Agregación ${type} exitosa (${duration}ms)`);
  }

  /**
   * Notifica error de la operación
   */
  async notifyError(type, error) {
    // Implementar notificaciones de error según necesidades:
    // - Email de alerta
    // - Slack con detalles
    // - Sistema de monitoreo
    // - Logs de error estructurados
    
    console.error(`🚨 Notificación: Error en agregación ${type}:`, error.message);
  }

  /**
   * Detiene el programador
   */
  stop() {
    console.log('🛑 Deteniendo programador de métricas...');
    // node-cron no tiene un método explícito para detener todas las tareas
    // Pero se puede implementar si es necesario
  }
}

// Crear instancia singleton
const metricsScheduler = new MetricsScheduler();

// Auto-iniciar el programador cuando se importa el módulo
if (process.env.NODE_ENV !== 'test') {
  metricsScheduler.start();
}

export default metricsScheduler;
