// backend/routes/metricsRoutes.js
import express from 'express';
import mongoose from 'mongoose';
import dayjs from 'dayjs';
import metricsService from '../services/metricsService.js';

const router = express.Router();

/**
 * GET /api/metrics/trends
 * Obtiene datos de tendencias para el dashboard usando datos reales
 */
router.get('/trends', async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      bucket = 'day',
      metric = 'volumen',
      entityType = 'tipo',
      entities,
      country,
      ageBucket,
      gender,
      tipoYerba
    } = req.query;

    console.log('📈 Trends request:', req.query);

    // Validar fechas
    const start = startDate ? dayjs(startDate) : dayjs().subtract(30, 'day');
    const end = endDate ? dayjs(endDate) : dayjs();

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        error: 'Fechas inválidas',
        message: 'Las fechas deben estar en formato YYYY-MM-DD'
      });
    }

    // Filtros base
    const baseFilters = {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      country: country && country !== 'ALL' ? country : undefined,
      ageBucket: ageBucket && ageBucket !== 'ALL' ? ageBucket : undefined,
      gender: gender && gender !== 'ALL' ? gender : undefined,
      tipoYerba: tipoYerba && tipoYerba !== 'ALL' ? tipoYerba : undefined
    };

    console.log('📊 Obteniendo datos reales de tendencias con filtros base:', baseFilters);

    // Procesar entidades específicas si se proporcionan
    const entityList = entities ? entities.split(',').filter(e => e.trim()) : [];
    
    // Si no se especifican entidades, obtener todas las entidades reales de la base de datos
    let realEntityList = entityList;
    if (realEntityList.length === 0) {
      realEntityList = await metricsService.getAvailableEntities(entityType);
      console.log(`📋 Entidades reales encontradas para tipo "${entityType}":`, realEntityList);
    }

    let series = [];

    if (realEntityList.length > 0) {
      console.log(`🎯 Procesando ${realEntityList.length} entidades:`, realEntityList);
      for (const entity of realEntityList) {
        try {
          const entityData = await getEntityTrendsData(entity, entityType, baseFilters, metric);
          if (entityData && entityData.length > 0) {
            series.push({
              entity: entity,
              values: entityData
            });
          }
        } catch (entityError) {
          console.warn(`❌ Error procesando entidad ${entity}:`, entityError.message);
        }
      }
    } else {
      // Si no hay entidades, usar datos agregados
      const overviewData = await metricsService.getOverviewData(baseFilters);
      const temporalData = overviewData.temporalActivity?.data || overviewData.weeklyActivity || [];
      if (temporalData.length > 0) {
        const values = temporalData.map(item => ({
          date: item.period || item.date,
          value: getMetricValue(item, metric),
          sample: item.events || 1
        }));
        series.push({
          entity: getDefaultEntityName(entityType, baseFilters),
          values
        });
      }
    }

    // Función para obtener datos de tendencias específicos por entidad
    async function getEntityTrendsData(entity, entityType, filters, metric) {
      try {
        console.log(`🔎 Obteniendo datos para entidad: ${entity} (${entityType})`);
        
        // Construir query específico para la entidad
        const entityFilters = { ...filters };
        
        // Mapear entityType a los campos correctos del filtro
        switch (entityType) {
          case 'tipo':
            entityFilters.tipoYerba = entity;
            break;
          case 'marca':
            entityFilters.marca = entity;
            break;
          case 'origen':
            entityFilters.origen = entity;
            break;
          case 'pais':
          case 'paisProd':
            entityFilters.paisProd = entity;
            break;
          case 'secado':
            entityFilters.secado = entity;
            break;
          case 'establecimiento':
            entityFilters.establecimiento = entity;
            break;
          case 'containsPalo':
          case 'palo':
            entityFilters.containsPalo = entity;
            break;
          case 'leafCut':
          case 'corte':
            entityFilters.leafCut = entity;
            break;
          case 'tipoEstacionamiento':
            entityFilters.tipoEstacionamiento = entity;
            break;
          case 'tiempoEstacionamiento':
            entityFilters.tiempoEstacionamiento = entity;
            break;
          case 'produccion':
            entityFilters.produccion = entity;
            break;
          default:
            console.warn(`⚠️ EntityType no reconocido: ${entityType}`);
            return [];
        }

        // Normalizar alias de campos para asegurar que buildYerbaQuery reciba las claves esperadas
        // (ej. pais <-> paisProd, tipoYerba <-> tipo)
        if (entityFilters.paisProd && !entityFilters.pais) {
          entityFilters.pais = entityFilters.paisProd;
        }
        if (entityFilters.pais && !entityFilters.paisProd) {
          entityFilters.paisProd = entityFilters.pais;
        }
        if (entityFilters.tipoYerba && !entityFilters.tipo) {
          entityFilters.tipo = entityFilters.tipoYerba;
        }
        if (entityFilters.tipo && !entityFilters.tipoYerba) {
          entityFilters.tipoYerba = entityFilters.tipo;
        }

        // Asegurar que campos booleanos o flags vengan como strings si es necesario
        if (typeof entityFilters.containsPalo === 'boolean') {
          entityFilters.containsPalo = entityFilters.containsPalo ? 'true' : 'false';
        }

        console.log(`📋 Filtros finales para entidad "${entity}":`, entityFilters);

        // Obtener datos del período actual
        const currentData = await metricsService.getOverviewData({
          ...entityFilters,
          startDate: currentStart.format('YYYY-MM-DD'),
          endDate: currentEnd.format('YYYY-MM-DD')
        });

        // Obtener datos del período anterior
        const previousData = await metricsService.getOverviewData({
          ...entityFilters,
          startDate: previousStart.format('YYYY-MM-DD'),
          endDate: previousEnd.format('YYYY-MM-DD')
        });

        // Debug: verificar datos obtenidos con más detalle
        console.log(`📊 ${entity} - Datos detallados obtenidos:`, {
          current: {
            discoveryRate: currentData.discoveryRate,
            usersWithTasting30d: currentData.usersWithTasting30d,
            temporalData: currentData.temporalActivity?.data?.length || 0,
            totalEvents: (currentData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
            hasData: !!currentData.temporalActivity?.data?.length
          },
          previous: {
            discoveryRate: previousData.discoveryRate,
            usersWithTasting30d: previousData.usersWithTasting30d,
            temporalData: previousData.temporalActivity?.data?.length || 0,
            totalEvents: (previousData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
            hasData: !!previousData.temporalActivity?.data?.length
          }
        });

        // Extraer valores según la métrica
        console.log(`🎯 Calculando valores para ${entity} con métrica ${metric}`);
        const currentValue = getMetricValueFromOverview(currentData, metric);
        const previousValue = getMetricValueFromOverview(previousData, metric);

        // Calcular tendencia
        let tendencyPercent = 0;
        let status = 'sin cambio';
        
        if (previousValue > 0) {
          tendencyPercent = ((currentValue - previousValue) / previousValue) * 100;
          status = tendencyPercent > 0 ? 'subida' : tendencyPercent < 0 ? 'bajada' : 'sin cambio';
        } else if (currentValue > 0) {
          tendencyPercent = 100; // Nuevo valor cuando antes era 0
          status = 'nueva actividad';
        }

        trends.push({
          entity,
          currentValue,
          previousValue,
          tendencyPercent: Math.round(tendencyPercent * 100) / 100, // 2 decimales
          status,
          sample: Math.min(currentValue, previousValue) // Para k-anonymity
        });

        console.log(`📊 ${entity}: ${previousValue} → ${currentValue} (${tendencyPercent.toFixed(1)}%)`);

      } catch (error) {
        console.error(`❌ Error procesando entidad ${entity}:`, error);
      }
    }

    // Calcular k-anonymity
    const totalSample = trends.reduce((sum, t) => sum + (t.sample || 0), 0);
    const kAnonymityOk = totalSample >= 10;

    const response = {
      kAnonymityOk,
      sample: {
        kAnonThreshold: 10,
        totalSample,
        entitiesCount: trends.length,
        source: 'trends-comparison'
      },
      trends: trends.sort((a, b) => Math.abs(b.tendencyPercent) - Math.abs(a.tendencyPercent)), // Ordenar por mayor cambio
      periods: {
        current: { start: currentStart.format('YYYY-MM-DD'), end: currentEnd.format('YYYY-MM-DD') },
        previous: { start: previousStart.format('YYYY-MM-DD'), end: previousEnd.format('YYYY-MM-DD') }
      },
      metric,
      entityType,
      _meta: {
        dataSource: 'trends-comparison',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Enviando tendencias calculadas:', {
      entitiesCount: trends.length,
      metric,
      avgTendency: trends.reduce((sum, t) => sum + Math.abs(t.tendencyPercent), 0) / trends.length
    });

    res.json(response);
  } catch (error) {
    console.error('Error en trends-comparison endpoint:', error);
    res.status(500).json({
      error: 'Error calculando tendencias',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/top-yerbas
 * Obtiene las yerbas más populares
 */
router.get('/top-yerbas', async (req, res) => {
  try {
    const { country, month, limit = 20 } = req.query;
    
    // TODO: Implementar lógica real cuando la base de datos esté lista
    
    const mockData = Array.from({ length: parseInt(limit) }, (_, i) => ({
      id: `yerba-${i + 1}`,
      nombre: `Yerba ${i + 1}`,
      marca: `Marca ${Math.floor(i / 4) + 1}`,
      popularidad: Math.floor(Math.random() * 1000) + 100,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10 // 3.0 - 5.0
    }));

    res.json({
      yerbas: mockData,
      total: mockData.length,
      filters: { country, month, limit }
    });
  } catch (error) {
    console.error('Error en top-yerbas endpoint:', error);
    res.status(500).json({
      error: 'Error obteniendo top yerbas',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/status
 * Estado del sistema de métricas
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      endpoints: {
        trends: 'active',
        topYerbas: 'active'
      }
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/entities
 * Obtiene todas las entidades disponibles por tipo desde la base de datos
 */
router.get('/entities', async (req, res) => {
  try {
    const { type } = req.query;
    
    console.log(`📋 Obteniendo entidades para tipo: ${type}`);
    
    if (!type) {
      return res.status(400).json({
        error: 'Tipo requerido',
        message: 'Debe especificar un tipo de entidad'
      });
    }

    const entities = await metricsService.getAvailableEntities(type);
    
    console.log(`✅ Entidades encontradas para ${type}:`, entities);
    
    res.json({
      type,
      entities,
      count: entities.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error obteniendo entidades para tipo ${type}:`, error);
    res.status(500).json({
      error: 'Error obteniendo entidades',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/notes-top
 * Obtiene los comentarios con más interacciones del período basado en likes y respuestas
 */
router.get('/notes-top', async (req, res) => {
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

    console.log('🎯 Comentarios top request with filters:', filters);

    // Usar la nueva lógica basada en interacciones de comentarios
    const data = await metricsService.getNotesTopByInteractions(filters);
    
    res.json(data);
  } catch (error) {
    console.error('Error en notes-top endpoint:', error);
    res.status(500).json({
      error: 'Error obteniendo comentarios top',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/trends-comparison
 * Obtiene comparación de tendencias entre entidades específicas
 */
router.get('/trends-comparison', async (req, res) => {
  try {
    const {
      metric = 'discoveryRate',
      entityType = 'tipo',
      entity,
      timePeriod = 'mes',
      entities,
      country,
      ageBucket,
      gender,
      tipoYerba,
      marca,
      origen,
      paisProd,
      secado
    } = req.query;

    console.log('📈 Trends-comparison request:', req.query);

    // Validar parámetros requeridos
    if (!entityType) {
      return res.status(400).json({
        error: 'Parámetro requerido faltante',
        message: 'entityType es requerido'
      });
    }

    // Calcular períodos de comparación basados en timePeriod
    const currentEnd = dayjs();
    let currentStart, previousStart, previousEnd;

    switch (timePeriod) {
      case 'dia':
        currentStart = currentEnd.subtract(1, 'day');
        previousStart = currentStart.subtract(1, 'day');
        previousEnd = currentStart.subtract(1, 'second');
        break;
      case 'semana':
        currentStart = currentEnd.subtract(1, 'week');
        previousStart = currentStart.subtract(1, 'week');
        previousEnd = currentStart.subtract(1, 'second');
        break;
      case 'mes':
        currentStart = currentEnd.subtract(1, 'month');
        previousStart = currentStart.subtract(1, 'month');
        previousEnd = currentStart.subtract(1, 'second');
        break;
      case 'trimestre':
        currentStart = currentEnd.subtract(3, 'month');
        previousStart = currentStart.subtract(3, 'month');
        previousEnd = currentStart.subtract(1, 'second');
        break;
      default:
        currentStart = currentEnd.subtract(1, 'month');
        previousStart = currentStart.subtract(1, 'month');
        previousEnd = currentStart.subtract(1, 'second');
    }

    console.log('📅 Períodos calculados:', {
      current: { start: currentStart.format('YYYY-MM-DD'), end: currentEnd.format('YYYY-MM-DD') },
      previous: { start: previousStart.format('YYYY-MM-DD'), end: previousEnd.format('YYYY-MM-DD') }
    });

    // Filtros base
    const baseFilters = {
      country: country && country !== 'ALL' && country !== 'all' ? country : undefined,
      ageBucket: ageBucket && ageBucket !== 'ALL' && ageBucket !== 'all' ? ageBucket : undefined,
      gender: gender && gender !== 'ALL' && gender !== 'all' ? gender : undefined,
      tipoYerba: tipoYerba && tipoYerba !== 'ALL' && tipoYerba !== 'all' ? tipoYerba : undefined,
      marca: marca && marca !== 'ALL' && marca !== 'all' ? marca : undefined,
      origen: origen && origen !== 'ALL' && origen !== 'all' ? origen : undefined,
      paisProd: paisProd && paisProd !== 'ALL' && paisProd !== 'all' ? paisProd : undefined,
      secado: secado && secado !== 'ALL' && secado !== 'all' ? secado : undefined
    };

    // Función para extraer valor de métrica desde overview data
    function getMetricValueFromOverview(overviewData, metric) {
      switch (metric) {
        case 'discoveryRate':
        case 'descubrimiento':
          // Para descubrimiento, usar el conteo de eventos de descubrimiento específicos
          // que está almacenado en overviewData.discoveryEvents (será agregado más adelante)
          const discoveryEvents = overviewData.discoveryEvents || 0;
          console.log(`🔍 Discovery events para métrica ${metric}:`, { 
            discoveryEvents,
            discoveryRate: overviewData.discoveryRate,
            finalValue: discoveryEvents
          });
          return discoveryEvents;
        case 'volumen':
          // Para volumen, usar la actividad temporal específica filtrada por entidad
          const temporalData = overviewData.temporalActivity?.data || [];
          const totalEvents = temporalData.reduce((sum, item) => sum + (item.events || 0), 0);
          return totalEvents > 0 ? totalEvents : 0;
        case 'engagement':
          // Calcular engagement como promedio de respuestas por review
          const temporalDataEng = overviewData.temporalActivity?.data || [];
          const totalEventsEng = temporalDataEng.reduce((sum, item) => sum + (item.events || 0), 0);
          return totalEventsEng > 0 ? totalEventsEng : 0;
        default:
          return 0;
      }
    }

    // Obtener lista de entidades a procesar
    let entityList = [];
    if (entity) {
      // Si se especifica una entidad específica
      entityList = [entity];
    } else if (entities) {
      // Si se especifican múltiples entidades
      entityList = entities.split(',').filter(e => e.trim());
    } else {
      // Si no se especifican entidades, obtener todas las disponibles
      entityList = await metricsService.getAvailableEntities(entityType);
      console.log(`📋 Entidades encontradas para tipo "${entityType}":`, entityList);
    }

    console.log(`🎯 Procesando ${entityList.length} entidades para comparación:`, entityList);

    const trends = [];

    // Procesar cada entidad
    for (const entityName of entityList) {
      try {
        console.log(`🔍 Procesando entidad: ${entityName}`);

        // Construir filtros específicos para la entidad
        const entityFilters = { ...baseFilters };

        // Mapear entityType a los campos correctos del filtro
        switch (entityType) {
          case 'tipo':
            entityFilters.tipoYerba = entityName;
            break;
          case 'marca':
            entityFilters.marca = entityName;
            break;
          case 'origen':
            entityFilters.origen = entityName;
            break;
          case 'pais':
          case 'paisProd':
            entityFilters.paisProd = entityName;
            break;
          case 'secado':
            entityFilters.secado = entityName;
            break;
          case 'establecimiento':
            entityFilters.establecimiento = entityName;
            break;
          case 'containsPalo':
          case 'palo':
            entityFilters.containsPalo = entityName;
            break;
          case 'leafCut':
          case 'corte':
            entityFilters.leafCut = entityName;
            break;
          case 'tipoEstacionamiento':
            entityFilters.tipoEstacionamiento = entityName;
            break;
          case 'tiempoEstacionamiento':
            entityFilters.tiempoEstacionamiento = entityName;
            break;
          case 'produccion':
            entityFilters.produccion = entityName;
            break;
          default:
            console.warn(`⚠️ EntityType no reconocido: ${entityType}`);
            continue;
        }

        // Normalizar alias de campos
        if (entityFilters.paisProd && !entityFilters.pais) {
          entityFilters.pais = entityFilters.paisProd;
        }
        if (entityFilters.pais && !entityFilters.paisProd) {
          entityFilters.paisProd = entityFilters.pais;
        }
        if (entityFilters.tipoYerba && !entityFilters.tipo) {
          entityFilters.tipo = entityFilters.tipoYerba;
        }
        if (entityFilters.tipo && !entityFilters.tipoYerba) {
          entityFilters.tipoYerba = entityFilters.tipo;
        }

        console.log(`📋 Filtros finales para entidad "${entityName}":`, entityFilters);

        // Obtener datos del período actual
        const currentData = await metricsService.getOverviewData({
          ...entityFilters,
          startDate: currentStart.format('YYYY-MM-DD'),
          endDate: currentEnd.format('YYYY-MM-DD')
        });

        // Obtener datos del período anterior
        const previousData = await metricsService.getOverviewData({
          ...entityFilters,
          startDate: previousStart.format('YYYY-MM-DD'),
          endDate: previousEnd.format('YYYY-MM-DD')
        });

        // Debug: verificar datos obtenidos con más detalle para debug del discovery rate
        console.log(`📊 ${entityName} - Datos detallados obtenidos:`, {
          current: {
            discoveryRate: currentData.discoveryRate,
            discoveryRateType: typeof currentData.discoveryRate,
            discoveryRateRaw: currentData.discoveryRate,
            usersWithTasting30d: currentData.usersWithTasting30d,
            temporalData: currentData.temporalActivity?.data?.length || 0,
            totalEvents: (currentData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
            hasData: !!currentData.temporalActivity?.data?.length
          },
          previous: {
            discoveryRate: previousData.discoveryRate,
            discoveryRateType: typeof previousData.discoveryRate,
            discoveryRateRaw: previousData.discoveryRate,
            usersWithTasting30d: previousData.usersWithTasting30d,
            temporalData: previousData.temporalActivity?.data?.length || 0,
            totalEvents: (previousData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
            hasData: !!previousData.temporalActivity?.data?.length
          }
        });

        // Extraer valores según la métrica
        console.log(`🎯 Calculando valores para ${entityName} con métrica ${metric}`);
        const currentValue = getMetricValueFromOverview(currentData, metric);
        const previousValue = getMetricValueFromOverview(previousData, metric);

        // Calcular tendencia
        let tendencyPercent = 0;
        let status = 'sin cambio';
        
        if (previousValue > 0) {
          tendencyPercent = ((currentValue - previousValue) / previousValue) * 100;
          status = tendencyPercent > 0 ? 'subida' : tendencyPercent < 0 ? 'bajada' : 'sin cambio';
        } else if (currentValue > 0) {
          tendencyPercent = 100; // Nuevo valor cuando antes era 0
          status = 'nueva actividad';
        }

        trends.push({
          entity: entityName,
          currentValue,
          previousValue,
          tendencyPercent: Math.round(tendencyPercent * 100) / 100, // 2 decimales
          status,
          sample: Math.min(currentValue, previousValue) // Para k-anonymity
        });

        console.log(`📊 ${entityName}: ${previousValue} → ${currentValue} (${tendencyPercent.toFixed(1)}%)`);

      } catch (error) {
        console.error(`❌ Error procesando entidad ${entityName}:`, error);
      }
    }

    // Calcular k-anonymity
    const totalSample = trends.reduce((sum, t) => sum + (t.sample || 0), 0);
    const kAnonymityOk = totalSample >= 10;

    const response = {
      kAnonymityOk,
      sample: {
        kAnonThreshold: 10,
        totalSample,
        entitiesCount: trends.length,
        source: 'trends-comparison'
      },
      trends: trends.sort((a, b) => Math.abs(b.tendencyPercent) - Math.abs(a.tendencyPercent)), // Ordenar por mayor cambio
      periods: {
        current: { start: currentStart.format('YYYY-MM-DD'), end: currentEnd.format('YYYY-MM-DD') },
        previous: { start: previousStart.format('YYYY-MM-DD'), end: previousEnd.format('YYYY-MM-DD') }
      },
      metric,
      entityType,
      _meta: {
        dataSource: 'trends-comparison',
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Enviando tendencias calculadas:', {
      entitiesCount: trends.length,
      metric,
      avgTendency: trends.reduce((sum, t) => sum + Math.abs(t.tendencyPercent), 0) / trends.length
    });

    res.json(response);
  } catch (error) {
    console.error('Error en trends-comparison endpoint:', error);
    res.status(500).json({
      error: 'Error calculando tendencias',
      message: error.message
    });
  }
});

/**
 * GET /api/metrics/debug-trends-data
 * Endpoint temporal para debuggear qué datos obtiene getOverviewData 
 * en el contexto de trends-comparison vs overview normal
 */
router.get('/debug-trends-data', async (req, res) => {
  try {
    const {
      metric = 'descubrimiento',
      entityType = 'tipo',
      timePeriod = 'mes'
    } = req.query;

    // Calcular períodos igual que en trends-comparison
    const currentEnd = dayjs();
    const currentStart = currentEnd.subtract(1, 'month');
    
    // Simular filtros para entidad "Tradicional"
    const entityFilters = {
      tipoYerba: 'Tradicional',
      startDate: currentStart.format('YYYY-MM-DD'),
      endDate: currentEnd.format('YYYY-MM-DD')
    };

    console.log('🔍 DEBUG - Filtros que se enviarán a getOverviewData:', entityFilters);

    // Llamar exactamente como lo hace trends-comparison
    const data = await metricsService.getOverviewData(entityFilters);

    console.log('🔍 DEBUG - Datos obtenidos de getOverviewData:', {
      discoveryRate: data.discoveryRate,
      discoveryRateType: typeof data.discoveryRate,
      usersWithTasting30d: data.usersWithTasting30d,
      temporalActivityData: data.temporalActivity?.data?.length || 0,
      fullData: JSON.stringify(data, null, 2)
    });

    res.json({
      debug: 'trends-comparison vs overview',
      filters: entityFilters,
      data: {
        discoveryRate: data.discoveryRate,
        discoveryRateType: typeof data.discoveryRate,
        usersWithTasting30d: data.usersWithTasting30d,
        temporalEvents: (data.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
        hasTemporalData: !!data.temporalActivity?.data?.length
      },
      _fullData: data
    });
  } catch (error) {
    console.error('Error en debug-trends-data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/debug-entity-data
 * Debug específico para verificar qué datos obtiene getOverviewData para una entidad
 */
router.get('/debug-entity-data', async (req, res) => {
  try {
    const entityName = req.query.entity || 'Tradicional';
    const entityType = req.query.entityType || 'tipo';
    
    // Calcular período igual que trends-comparison
    const currentEnd = dayjs();
    const currentStart = currentEnd.subtract(1, 'month');
    
    // Construir filtros igual que trends-comparison
    const baseFilters = {
      country: undefined,
      ageBucket: undefined,
      gender: undefined,
      tipoYerba: undefined,
      marca: undefined,
      origen: undefined,
      paisProd: undefined,
      secado: undefined
    };
    
    const entityFilters = { ...baseFilters };
    entityFilters.tipoYerba = entityName;
    
    const finalFilters = {
      ...entityFilters,
      startDate: currentStart.format('YYYY-MM-DD'),
      endDate: currentEnd.format('YYYY-MM-DD')
    };
    
    console.log('🔍 DEBUG-ENTITY - Filtros enviados:', finalFilters);
    
    // Llamar exactamente como trends-comparison
    const data = await metricsService.getOverviewData(finalFilters);
    
    console.log('🔍 DEBUG-ENTITY - Raw data discovery rate:', {
      discoveryRate: data.discoveryRate,
      type: typeof data.discoveryRate,
      raw: JSON.stringify(data.discoveryRate)
    });
    
    // Simular la función getMetricValueFromOverview
    const discoveryValue = parseFloat(data.discoveryRate || 0);
    
    res.json({
      entity: entityName,
      entityType,
      filters: finalFilters,
      rawDiscoveryRate: data.discoveryRate,
      parsedDiscoveryRate: discoveryValue,
      discoveryRateType: typeof data.discoveryRate,
      otherData: {
        usersWithTasting30d: data.usersWithTasting30d,
        temporalEvents: (data.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error en debug-entity-data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/metrics/debug-frontend-issue
 * Endpoint temporal para diagnosticar específicamente por qué el frontend 
 * muestra que no hay datos para otras entidades
 */
router.get('/debug-frontend-issue', async (req, res) => {
  try {
    console.log('🔍 DEBUG-FRONTEND - Request completo:', {
      url: req.url,
      query: req.query,
      method: req.method
    });

    // Obtener todas las entidades disponibles para diferentes tipos
    const entityTypes = ['tipo', 'marca', 'pais', 'establecimiento', 'tipoEstacionamiento'];
    const entitiesData = {};
    
    for (const entityType of entityTypes) {
      try {
        const entities = await metricsService.getAvailableEntities(entityType);
        entitiesData[entityType] = entities;
      } catch (error) {
        entitiesData[entityType] = { error: error.message };
      }
    }

    // Probar trends-comparison para diferentes combinaciones
    const testCases = [
      { metric: 'volumen', entityType: 'tipo' },
      { metric: 'descubrimiento', entityType: 'tipo' },
      { metric: 'volumen', entityType: 'pais' },
      { metric: 'descubrimiento', entityType: 'pais' },
      { metric: 'volumen', entityType: 'establecimiento' },
      { metric: 'descubrimiento', entityType: 'establecimiento' }
    ];

    const testResults = {};
    for (const testCase of testCases) {
      try {
        const testKey = `${testCase.metric}_${testCase.entityType}`;
        
        // Simular llamada igual que trends-comparison
        const currentEnd = dayjs();
        const currentStart = currentEnd.subtract(1, 'month');
        
        const entityList = await metricsService.getAvailableEntities(testCase.entityType);
        
        console.log(`🧪 Testing ${testKey} with entities:`, entityList.slice(0, 2));
        
        testResults[testKey] = {
          entityType: testCase.entityType,
          metric: testCase.metric,
          availableEntitiesCount: entityList.length,
          firstTwoEntities: entityList.slice(0, 2),
          sampleTest: 'pending'
        };

        // Hacer una prueba rápida con la primera entidad si existe
        if (entityList.length > 0) {
          const firstEntity = entityList[0];
          const entityFilters = {};
          
          // Mapear igual que en trends-comparison
          switch (testCase.entityType) {
            case 'tipo':
              entityFilters.tipoYerba = firstEntity;
              break;
            case 'pais':
              entityFilters.paisProd = firstEntity;
              break;
            case 'establecimiento':
              entityFilters.establecimiento = firstEntity;
              break;
            // Agregar más casos según necesidades
          }
          
          const overviewData = await metricsService.getOverviewData({
            ...entityFilters,
            startDate: currentStart.format('YYYY-MM-DD'),
            endDate: currentEnd.format('YYYY-MM-DD')
          });
          
          testResults[testKey].sampleTest = {
            entity: firstEntity,
            hasData: !!overviewData,
            discoveryRate: overviewData.discoveryRate,
            temporalDataPoints: overviewData.temporalActivity?.data?.length || 0,
            totalEvents: (overviewData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0)
          };
        }
        
      } catch (error) {
        testResults[testCase.metric + '_' + testCase.entityType] = { error: error.message };
      }
    }

    const response = {
      timestamp: new Date().toISOString(),
      availableEntities: entitiesData,
      testResults,
      backendWorking: true,
      message: 'Debug completo de entidades y tendencias'
    };

    console.log('📤 DEBUG-FRONTEND - Enviando resultado:', {
      entityTypesWithData: Object.keys(entitiesData),
      testCasesRun: Object.keys(testResults).length
    });

    res.json(response);
  } catch (error) {
    console.error('❌ Error en debug-frontend-issue:', error);
    res.status(500).json({ 
      error: 'Error en debug',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/metrics/debug-metrics-deep
 * Debug profundo de las métricas volumen y descubrimiento
 */
router.get('/debug-metrics-deep', async (req, res) => {
  try {
    const {
      metric = 'volumen',
      entityType = 'tipo',
      entity = 'Tradicional',
      timePeriod = 'mes'
    } = req.query;

    console.log('🔍 DEBUG-METRICS-DEEP - Iniciando análisis profundo:', {
      metric,
      entityType,
      entity,
      timePeriod
    });

    // Calcular períodos igual que trends-comparison
    const currentEnd = dayjs();
    const currentStart = currentEnd.subtract(1, 'month');
    const previousStart = currentStart.subtract(1, 'month');
    const previousEnd = currentStart.subtract(1, 'second');

    // Construir filtros para la entidad
    const entityFilters = {};
    switch (entityType) {
      case 'tipo':
        entityFilters.tipoYerba = entity;
        break;
      case 'marca':
        entityFilters.marca = entity;
        break;
      case 'pais':
      case 'paisProd':
        entityFilters.paisProd = entity;
        break;
      case 'establecimiento':
        entityFilters.establecimiento = entity;
        break;
      // Agregar más casos según necesidad
    }

    console.log('🎯 Filtros construidos para entidad:', entityFilters);

    // Obtener datos del período actual
    const currentFilters = {
      ...entityFilters,
      startDate: currentStart.format('YYYY-MM-DD'),
      endDate: currentEnd.format('YYYY-MM-DD')
    };

    const previousFilters = {
      ...entityFilters,
      startDate: previousStart.format('YYYY-MM-DD'),
      endDate: previousEnd.format('YYYY-MM-DD')
    };

    console.log('📅 Filtros con fechas:', {
      current: currentFilters,
      previous: previousFilters
    });

    // Llamar getOverviewData para ambos períodos
    const [currentData, previousData] = await Promise.all([
      metricsService.getOverviewData(currentFilters),
      metricsService.getOverviewData(previousFilters)
    ]);

    console.log('📊 Datos brutos obtenidos:', {
      current: {
        discoveryRate: currentData.discoveryRate,
        temporalActivity: currentData.temporalActivity?.data?.length || 0,
        temporalEvents: (currentData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
        temporalDataSample: currentData.temporalActivity?.data?.slice(0, 2)
      },
      previous: {
        discoveryRate: previousData.discoveryRate,
        temporalActivity: previousData.temporalActivity?.data?.length || 0,
        temporalEvents: (previousData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0),
        temporalDataSample: previousData.temporalActivity?.data?.slice(0, 2)
      }
    });

    // Simular la función getMetricValueFromOverview para ambas métricas
    const currentVolumen = (currentData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0);
    const previousVolumen = (previousData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0);
    
    const currentDiscovery = parseFloat(currentData.discoveryRate || 0);
    const previousDiscovery = parseFloat(previousData.discoveryRate || 0);

    // Calcular tendencias
    const volumenTendency = previousVolumen > 0 
      ? ((currentVolumen - previousVolumen) / previousVolumen) * 100
      : (currentVolumen > 0 ? 100 : 0);

    const discoveryTendency = previousDiscovery > 0 
      ? ((currentDiscovery - previousDiscovery) / previousDiscovery) * 100  
      : (currentDiscovery > 0 ? 100 : 0);

    const result = {
      debug: 'deep-metrics-analysis',
      entity,
      entityType,
      periods: {
        current: { start: currentStart.format('YYYY-MM-DD'), end: currentEnd.format('YYYY-MM-DD') },
        previous: { start: previousStart.format('YYYY-MM-DD'), end: previousEnd.format('YYYY-MM-DD') }
      },
      filters: {
        entityFilters,
        currentFilters,
        previousFilters
      },
      metrics: {
        volumen: {
          current: currentVolumen,
          previous: previousVolumen,
          tendency: Math.round(volumenTendency * 100) / 100,
          rawTemporalData: currentData.temporalActivity?.data
        },
        descubrimiento: {
          current: currentDiscovery,
          previous: previousDiscovery,
          tendency: Math.round(discoveryTendency * 100) / 100,
          rawDiscoveryData: {
            currentRate: currentData.discoveryRate,
            previousRate: previousData.discoveryRate
          }
        }
      },
      validation: {
        hasCurrentTemporalData: !!(currentData.temporalActivity?.data?.length),
        hasPreviousTemporalData: !!(previousData.temporalActivity?.data?.length),
        currentTemporalDataPoints: currentData.temporalActivity?.data?.length || 0,
        previousTemporalDataPoints: previousData.temporalActivity?.data?.length || 0,
        totalCurrentEvents: currentVolumen,
        totalPreviousEvents: previousVolumen
      },
      timestamp: new Date().toISOString()
    };

    console.log('📤 DEBUG-METRICS-DEEP - Resultado final:', {
      entity,
      volumenTrend: volumenTendency,
      discoveryTrend: discoveryTendency,
      hasData: currentVolumen > 0 || previousVolumen > 0
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error en debug-metrics-deep:', error);
    res.status(500).json({ 
      error: 'Error en debug profundo',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/metrics/debug-metrics-new
 * Debug para verificar la nueva lógica de métricas
 */
router.get('/debug-metrics-new', async (req, res) => {
  try {
    const {
      metric = 'descubrimiento',
      entityType = 'tipo',
      entity = 'Tradicional'
    } = req.query;

    console.log('🔍 DEBUG-METRICS-NEW - Verificando nueva lógica:', {
      metric,
      entityType,
      entity
    });

    // Calcular períodos
    const currentEnd = dayjs();
    const currentStart = currentEnd.subtract(1, 'month');
    const previousStart = currentStart.subtract(1, 'month');
    const previousEnd = currentStart.subtract(1, 'second');

    // Construir filtros para la entidad
    const entityFilters = {};
    switch (entityType) {
      case 'tipo':
        entityFilters.tipoYerba = entity;
        break;
      case 'marca':
        entityFilters.marca = entity;
        break;
      case 'pais':
      case 'paisProd':
        entityFilters.paisProd = entity;
        break;
      default:
        entityFilters.tipoYerba = entity;
    }

    // Obtener datos para ambos períodos
    const currentFilters = {
      ...entityFilters,
      startDate: currentStart.format('YYYY-MM-DD'),
      endDate: currentEnd.format('YYYY-MM-DD')
    };

    const previousFilters = {
      ...entityFilters,
      startDate: previousStart.format('YYYY-MM-DD'),
      endDate: previousEnd.format('YYYY-MM-DD')
    };

    const [currentData, previousData] = await Promise.all([
      metricsService.getOverviewData(currentFilters),
      metricsService.getOverviewData(previousFilters)
    ]);

    // Extraer métricas específicas
    const currentVolumen = (currentData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0);
    const previousVolumen = (previousData.temporalActivity?.data || []).reduce((sum, item) => sum + (item.events || 0), 0);
    
    const currentDescubrimiento = currentData.discoveryEvents || 0;
    const previousDescubrimiento = previousData.discoveryEvents || 0;

    const response = {
      entity,
      entityType,
      metric,
      periods: {
        current: { start: currentStart.format('YYYY-MM-DD'), end: currentEnd.format('YYYY-MM-DD') },
        previous: { start: previousStart.format('YYYY-MM-DD'), end: previousEnd.format('YYYY-MM-DD') }
      },
      volumen: {
        current: currentVolumen,
        previous: previousVolumen,
        change: currentVolumen - previousVolumen,
        changePercent: previousVolumen > 0 ? ((currentVolumen - previousVolumen) / previousVolumen) * 100 : (currentVolumen > 0 ? 100 : 0)
      },
      descubrimiento: {
        current: currentDescubrimiento,
        previous: previousDescubrimiento,
        change: currentDescubrimiento - previousDescubrimiento,
        changePercent: previousDescubrimiento > 0 ? ((currentDescubrimiento - previousDescubrimiento) / previousDescubrimiento) * 100 : (currentDescubrimiento > 0 ? 100 : 0)
      },
      rawData: {
        current: {
          discoveryRate: currentData.discoveryRate,
          discoveryEvents: currentData.discoveryEvents,
          usersWithTasting: currentData.usersWithTasting30d,
          temporalEvents: currentVolumen
        },
        previous: {
          discoveryRate: previousData.discoveryRate,
          discoveryEvents: previousData.discoveryEvents,
          usersWithTasting: previousData.usersWithTasting30d,
          temporalEvents: previousVolumen
        }
      }
    };

    console.log('📊 DEBUG-METRICS-NEW - Resultado:', response);

    res.json(response);

  } catch (error) {
    console.error('❌ Error en debug-metrics-new:', error);
    res.status(500).json({ 
      error: 'Error en debug de métricas',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
