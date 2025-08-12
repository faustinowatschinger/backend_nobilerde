// backend/routes/dashboardRoutes.js
import express from 'express';
import metricsService from '../services/metricsService.js';
import metricsCache from '../services/metricsCache.js';

const router = express.Router();

/**
 * GET /api/dashboard/overview
 * Obtiene datos del overview del dashboard (desde cache en tiempo real)
 */
router.get('/overview', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      timePeriod: req.query.timePeriod,
      timeQuantity: req.query.timeQuantity,
      useCustomDates: req.query.useCustomDates,
      country: req.query.country,
      ageBucket: req.query.ageBucket,
      gender: req.query.gender,
      tipoYerba: req.query.tipoYerba,
      marca: req.query.marca,
      origen: req.query.origen,
      paisProd: req.query.paisProd,
      secado: req.query.secado
    };

    // Filtrar valores vacíos
    Object.keys(filters).forEach(key => {
      if (!filters[key] || filters[key] === '') {
        delete filters[key];
      }
    });

    console.log('📊 Dashboard overview request with filters:', filters);

    // Usar cache para obtener métricas
    const data = await metricsCache.getMetrics(filters, metricsService);
    
    res.json(data);
  } catch (error) {
    console.error('Error in dashboard overview:', error);
    res.status(500).json({ 
      error: 'Error obteniendo datos del dashboard',
      message: error.message 
    });
  }
});

/**
 * POST /api/dashboard/overview/refresh
 * Fuerza la actualización de métricas para filtros específicos
 */
router.post('/overview/refresh', async (req, res) => {
  try {
    const filters = req.body || {};
    
    // Filtrar valores vacíos
    Object.keys(filters).forEach(key => {
      if (!filters[key] || filters[key] === '') {
        delete filters[key];
      }
    });

    console.log('🔄 Dashboard force refresh request with filters:', filters);

    // Forzar actualización de métricas
    const data = await metricsCache.forceUpdate(filters, metricsService);
    
    res.json(data);
  } catch (error) {
    console.error('Error in dashboard refresh:', error);
    res.status(500).json({ 
      error: 'Error refrescando datos del dashboard',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/filters/:filterType
 * Obtiene opciones disponibles para un tipo de filtro específico
 */
router.get('/filters/:filterType', async (req, res) => {
  try {
    const { filterType } = req.params;
    
    console.log(`📋 Getting filter options for: ${filterType}`);
    
    const options = await metricsService.getFilterOptions(filterType);
    
    res.json(options);
  } catch (error) {
    console.error(`Error getting filter options for ${req.params.filterType}:`, error);
    res.status(500).json({ 
      error: 'Error obteniendo opciones de filtros',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/market-trends
 * Obtiene datos de tendencias de mercado
 */
router.get('/market-trends', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para tendencias de mercado
    res.json({
      message: 'Market trends endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in market trends:', error);
    res.status(500).json({ 
      error: 'Error obteniendo tendencias de mercado',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/flavors
 * Obtiene análisis de sabores
 */
router.get('/flavors', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para análisis de sabores
    res.json({
      message: 'Flavor analysis endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in flavor analysis:', error);
    res.status(500).json({ 
      error: 'Error obteniendo análisis de sabores',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/brands
 * Obtiene comparación de marcas
 */
router.get('/brands', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para comparación de marcas
    res.json({
      message: 'Brand comparison endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in brand comparison:', error);
    res.status(500).json({ 
      error: 'Error obteniendo comparación de marcas',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/geography
 * Obtiene análisis geográfico
 */
router.get('/geography', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para análisis geográfico
    res.json({
      message: 'Geography analysis endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in geography analysis:', error);
    res.status(500).json({ 
      error: 'Error obteniendo análisis geográfico',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/audience
 * Obtiene análisis de audiencia
 */
router.get('/audience', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para análisis de audiencia
    res.json({
      message: 'Audience analysis endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in audience analysis:', error);
    res.status(500).json({ 
      error: 'Error obteniendo análisis de audiencia',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/alerts
 * Obtiene alertas y experimentos
 */
router.get('/alerts', async (req, res) => {
  try {
    // TODO: Implementar lógica específica para alertas y experimentos
    res.json({
      message: 'Alerts and experiments endpoint - Coming soon',
      data: []
    });
  } catch (error) {
    console.error('Error in alerts and experiments:', error);
    res.status(500).json({ 
      error: 'Error obteniendo alertas y experimentos',
      message: error.message 
    });
  }
});

/**
 * GET /api/dashboard/cache/stats
 * Obtiene estadísticas del cache de métricas
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = metricsCache.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ 
      error: 'Error obteniendo estadísticas del cache',
      message: error.message 
    });
  }
});

/**
 * POST /api/dashboard/cache/clear
 * Limpia el cache de métricas
 */
router.post('/cache/clear', async (req, res) => {
  try {
    metricsCache.clearCache();
    res.json({ message: 'Cache limpiado exitosamente' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      error: 'Error limpiando cache',
      message: error.message 
    });
  }
});

/**
 * POST /api/dashboard/cache/update-interval
 * Configura el intervalo de actualización del cache
 */
router.post('/cache/update-interval', async (req, res) => {
  try {
    const { interval } = req.body;
    
    if (!interval || interval < 10000) { // Mínimo 10 segundos
      return res.status(400).json({ 
        error: 'Intervalo debe ser al menos 10000ms (10 segundos)' 
      });
    }
    
    metricsCache.setUpdateInterval(interval);
    res.json({ 
      message: 'Intervalo de actualización configurado',
      interval 
    });
  } catch (error) {
    console.error('Error setting update interval:', error);
    res.status(500).json({ 
      error: 'Error configurando intervalo',
      message: error.message 
    });
  }
});

/**
 * GET /api/metrics/notes-top
 * Obtiene las notas sensoriales más populares del período basado en interacciones
 */
router.get('/metrics/notes-top', async (req, res) => {
  try {
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      timePeriod: req.query.timePeriod,
      timeQuantity: req.query.timeQuantity,
      useCustomDates: req.query.useCustomDates,
      country: req.query.country,
      ageBucket: req.query.ageBucket,
      gender: req.query.gender,
      tipoYerba: req.query.tipoYerba,
      marca: req.query.marca,
      origen: req.query.origen,
      paisProd: req.query.paisProd,
      secado: req.query.secado
    };

    // Filtrar valores vacíos
    Object.keys(filters).forEach(key => {
      if (!filters[key] || filters[key] === '') {
        delete filters[key];
      }
    });

    console.log('🎯 Notes top request with filters:', filters);

    // Usar la nueva lógica basada en interacciones
    const data = await metricsService.getNotesTopByInteractions(filters);
    
    res.json(data);
  } catch (error) {
    console.error('Error in notes top endpoint:', error);
    res.status(500).json({ 
      error: 'Error obteniendo notas sensoriales top',
      message: error.message 
    });
  }
});

export default router;
