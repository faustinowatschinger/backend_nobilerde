// backend/routes/metricsRoutes.js
import express from 'express';
import metricsAggregator from '../services/metricsAggregator.js';
import metricsScheduler from '../jobs/scheduleMetrics.js';
import { authenticateToken, requireRole } from '../auth/middleware/authMiddleware.js';

const router = express.Router();

/**
 * Middleware para validar parámetros comunes
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({
      success: false,
      error: 'startDate debe tener formato YYYY-MM-DD'
    });
  }
  
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      error: 'endDate debe tener formato YYYY-MM-DD'
    });
  }
  
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      success: false,
      error: 'startDate no puede ser mayor que endDate'
    });
  }
  
  next();
};

/**
 * GET /api/metrics/top-yerbas
 * Obtiene las yerbas más populares por país y período
 * Query params: country, month, limit
 */
router.get('/top-yerbas', authenticateToken, requireRole('admin'), validateDateRange, async (req, res) => {
  try {
    const { country, month, limit = 20 } = req.query;
    
    // Construir filtro dinámicamente
    const filter = {};
    if (country) filter['_id.country'] = country;
    if (month) filter['_id.month'] = month;
    
    const results = await metricsAggregator.getMetrics(
      'metrics_top_yerbas', 
      filter, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        metrics: results,
        filters: { country, month },
        total: results.length,
        lastUpdated: results.length > 0 ? results[0].lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo top yerbas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/flavor-notes
 * Obtiene las notas de sabor más frecuentes por región y demografía
 * Query params: country, ageBucket, gender, limit
 */
router.get('/flavor-notes', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { country, ageBucket, gender, limit = 50 } = req.query;
    
    const filter = {};
    if (country) filter['_id.country'] = country;
    if (ageBucket) filter['_id.ageBucket'] = ageBucket;
    if (gender) filter['_id.gender'] = gender;
    
    const results = await metricsAggregator.getMetrics(
      'metrics_flavor_notes', 
      filter, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        metrics: results,
        filters: { country, ageBucket, gender },
        total: results.length,
        lastUpdated: results.length > 0 ? results[0].lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo notas de sabor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/trends
 * Obtiene tendencias temporales de puntuaciones por tipo de yerba
 * Query params: type, weeks, containsPalo, secado
 */
router.get('/trends', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { type, weeks = 8, containsPalo, secado, limit = 100 } = req.query;
    
    const filter = {};
    if (type) filter['_id.yerbaTipo'] = type;
    if (containsPalo !== undefined) filter['_id.containsPalo'] = containsPalo === 'true';
    if (secado) filter['_id.secado'] = secado;
    
    // Filtrar por semanas recientes si se especifica
    if (weeks) {
      const weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - (parseInt(weeks) * 7));
      const weekString = weeksAgo.toISOString().split('T')[0];
      // Esto es una aproximación - en producción se necesitaría lógica más precisa para semanas
    }
    
    const results = await metricsAggregator.getMetrics(
      'metrics_trends', 
      filter, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        metrics: results,
        filters: { type, weeks, containsPalo, secado },
        total: results.length,
        lastUpdated: results.length > 0 ? results[0].lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo tendencias:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/user-behavior
 * Obtiene métricas de comportamiento de usuarios
 * Query params: eventType, country, days
 */
router.get('/user-behavior', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { eventType, country, days = 30, limit = 100 } = req.query;
    
    const filter = {};
    if (eventType) filter['_id.eventType'] = eventType;
    if (country) filter['_id.country'] = country;
    
    const results = await metricsAggregator.getMetrics(
      'metrics_user_behavior', 
      filter, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        metrics: results,
        filters: { eventType, country, days },
        total: results.length,
        lastUpdated: results.length > 0 ? results[0].lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo comportamiento de usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/discovery
 * Obtiene métricas de descubrimiento vs fidelidad
 * Query params: country, yerbaRange
 */
router.get('/discovery', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { country, yerbaRange, limit = 50 } = req.query;
    
    const filter = {};
    if (country) filter['_id.country'] = country;
    if (yerbaRange) filter['_id.yerbaRange'] = yerbaRange;
    
    const results = await metricsAggregator.getMetrics(
      'metrics_discovery', 
      filter, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        metrics: results,
        filters: { country, yerbaRange },
        total: results.length,
        lastUpdated: results.length > 0 ? results[0].lastUpdated : null
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo métricas de descubrimiento:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/status
 * Obtiene el estado del sistema de métricas
 */
router.get('/status', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const schedulerStatus = metricsScheduler.getStatus();
    
    res.json({
      success: true,
      data: {
        scheduler: schedulerStatus,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version
        },
        lastMetricsRun: schedulerStatus.lastRun
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo status:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/metrics/trigger-aggregation
 * Ejecuta agregación manual (solo para admins, útil para testing)
 */
router.post('/trigger-aggregation', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Ejecutar en background para no bloquear la respuesta
    metricsScheduler.runManual().catch(error => {
      console.error('❌ Error en agregación manual:', error);
    });
    
    res.json({
      success: true,
      message: 'Agregación manual iniciada en background',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error iniciando agregación manual:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/metrics/summary
 * Obtiene un resumen general de todas las métricas
 */
router.get('/summary', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { country } = req.query;
    
    // Obtener muestras de cada tipo de métrica
    const [topYerbas, flavorNotes, trends, userBehavior, discovery] = await Promise.all([
      metricsAggregator.getMetrics('metrics_top_yerbas', country ? { '_id.country': country } : {}, 5),
      metricsAggregator.getMetrics('metrics_flavor_notes', country ? { '_id.country': country } : {}, 10),
      metricsAggregator.getMetrics('metrics_trends', {}, 5),
      metricsAggregator.getMetrics('metrics_user_behavior', country ? { '_id.country': country } : {}, 5),
      metricsAggregator.getMetrics('metrics_discovery', country ? { '_id.country': country } : {}, 5)
    ]);
    
    res.json({
      success: true,
      data: {
        summary: {
          topYerbas: { count: topYerbas.length, sample: topYerbas },
          flavorNotes: { count: flavorNotes.length, sample: flavorNotes },
          trends: { count: trends.length, sample: trends },
          userBehavior: { count: userBehavior.length, sample: userBehavior },
          discovery: { count: discovery.length, sample: discovery }
        },
        filters: { country },
        lastUpdated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo resumen:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Función auxiliar para validar formato de fecha
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

export default router;
