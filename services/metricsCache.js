// backend/services/metricsCache.js
import EventEmitter from 'events';

/**
 * Cache de métricas en tiempo real para el dashboard
 * Mantiene las métricas actualizadas en memoria y las expone bajo demanda
 */
class MetricsCache extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.lastUpdate = new Map();
    this.updateInterval = 60000; // 1 minuto por defecto
    this.isUpdating = false;
    
    // Configurar intervalos de actualización automática
    this.setupAutoUpdate();
  }

  /**
   * Configura la actualización automática de métricas
   */
  setupAutoUpdate() {
    setInterval(async () => {
      await this.updateAllMetrics();
    }, this.updateInterval);
    
    // Actualización inicial
    this.updateAllMetrics();
  }

  /**
   * Genera una clave única para el cache basada en filtros
   */
  generateCacheKey(filters = {}) {
    const {
      startDate,
      endDate,
      timePeriod,
      timeQuantity,
      useCustomDates,
      country,
      ageBucket,
      gender,
      tipoYerba,
      marca,
      origen,
      paisProd,
      secado
    } = filters;

    const keyParts = [
      startDate || 'all',
      endDate || 'all',
      timePeriod || 'mes',
      timeQuantity || '1',
      useCustomDates || 'false',
      country || 'all',
      ageBucket || 'all',
      gender || 'all',
      tipoYerba || 'all',
      marca || 'all',
      origen || 'all',
      paisProd || 'all',
      secado || 'all'
    ];

    return keyParts.join('|');
  }

  /**
   * Obtiene métricas del cache o calcula si no existen
   */
  async getMetrics(filters = {}, metricsService) {
    const cacheKey = this.generateCacheKey(filters);
    
    // Si tenemos datos en cache y son recientes, los devolvemos
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      const lastUpdate = this.lastUpdate.get(cacheKey);
      const isRecent = Date.now() - lastUpdate < this.updateInterval;
      
      if (isRecent) {
        return {
          ...cachedData,
          _meta: {
            cached: true,
            lastUpdate: lastUpdate,
            source: 'cache'
          }
        };
      }
    }

    // Si no hay cache o es muy viejo, calculamos y guardamos
    try {
      console.log(`Calculando métricas para filtros: ${cacheKey}`);
      const metrics = await metricsService.getOverviewData(filters);
      
      this.cache.set(cacheKey, metrics);
      this.lastUpdate.set(cacheKey, Date.now());
      
      this.emit('metricsUpdated', { filters, metrics, cacheKey });
      
      return {
        ...metrics,
        _meta: {
          cached: false,
          lastUpdate: Date.now(),
          source: 'calculated'
        }
      };
    } catch (error) {
      console.error('Error calculando métricas:', error);
      
      // Si hay error y tenemos cache viejo, lo devolvemos con advertencia
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey);
        return {
          ...cachedData,
          _meta: {
            cached: true,
            lastUpdate: this.lastUpdate.get(cacheKey),
            source: 'cache-fallback',
            warning: 'Datos de cache por error en cálculo'
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Actualiza todas las métricas en cache
   */
  async updateAllMetrics() {
    if (this.isUpdating) return;
    
    this.isUpdating = true;
    console.log('Iniciando actualización automática de métricas...');
    
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { MetricsService } = await import('./metricsService.js');
      const metricsService = new MetricsService();
      
      // Actualizar métricas para filtros comunes
      const commonFilters = [
        {}, // Sin filtros (general)
        { dateRange: '30d' }, // Últimos 30 días
        { dateRange: '7d' }, // Última semana
        { country: 'Argentina' }, // Solo Argentina
        { gender: 'masculino' }, // Solo hombres
        { gender: 'femenino' } // Solo mujeres
      ];

      for (const filters of commonFilters) {
        try {
          await this.getMetrics(filters, metricsService);
        } catch (error) {
          console.error(`Error actualizando métricas para filtros ${JSON.stringify(filters)}:`, error);
        }
      }
      
      console.log('Actualización automática completada');
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Fuerza la actualización de métricas para filtros específicos
   */
  async forceUpdate(filters = {}, metricsService) {
    const cacheKey = this.generateCacheKey(filters);
    
    // Eliminar del cache para forzar recálculo
    this.cache.delete(cacheKey);
    this.lastUpdate.delete(cacheKey);
    
    return await this.getMetrics(filters, metricsService);
  }

  /**
   * Limpia el cache
   */
  clearCache() {
    this.cache.clear();
    this.lastUpdate.clear();
    console.log('Cache de métricas limpiado');
  }

  /**
   * Obtiene estadísticas del cache
   */
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      lastUpdateTimes: {},
      isUpdating: this.isUpdating,
      updateInterval: this.updateInterval
    };

    for (const [key, timestamp] of this.lastUpdate) {
      stats.lastUpdateTimes[key] = {
        timestamp,
        age: Date.now() - timestamp,
        formattedAge: new Date(Date.now() - timestamp).toISOString().substr(11, 8)
      };
    }

    return stats;
  }

  /**
   * Configura el intervalo de actualización
   */
  setUpdateInterval(milliseconds) {
    this.updateInterval = milliseconds;
    console.log(`Intervalo de actualización cambiado a ${milliseconds}ms`);
  }
}

// Crear instancia singleton
const metricsCache = new MetricsCache();

export default metricsCache;
