// backend/services/metricsService.js
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';

/**
 * Servicio para generar métricas y análisis del dashboard
 */
class MetricsService {
  
  /**
   * Obtiene datos del overview del dashboard
   */
  async getOverviewData(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        timePeriod = 'mes',
        country,
        ageBucket,
        gender,
        tipoYerba,
        marca,
        origen,
        paisProd,
        secado
      } = filters;

      console.log('🔍 getOverviewData llamado con filtros:', {
        startDate,
        endDate,
        timePeriod,
        country,
        ageBucket,
        gender,
        tipoYerba,
        marca,
        origen,
        paisProd,
        secado
      });

      // Asegurar que las fechas sean objetos Date
      let calculatedStart, calculatedEnd;
      const now = new Date();

      if (startDate && endDate) {
        // Si se proporcionan fechas específicas, convertirlas a Date si son strings
        if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          calculatedStart = new Date(`${startDate}T00:00:00.000Z`);
        } else {
          calculatedStart = typeof startDate === 'string' ? new Date(startDate) : startDate;
        }
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          calculatedEnd = new Date(`${endDate}T23:59:59.999Z`);
        } else {
          calculatedEnd = typeof endDate === 'string' ? new Date(endDate) : endDate;
        }
        
        console.log('📅 Usando fechas proporcionadas:', {
          start: calculatedStart.toISOString(),
          end: calculatedEnd.toISOString()
        });
      } else {
        // Calcular fechas basadas en el período de tiempo
        switch (timePeriod) {
          case 'dia':
            // Para período de día, usar el día completo de hoy (00:00 a 23:59:59) en UTC
            const today = new Date();
            calculatedStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
            calculatedEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
            break;
          case 'semana':
            // Para período de semana, usar los últimos 7 días completos (incluyendo todo el día de hoy) en UTC
            const nowWeek = new Date();
            calculatedEnd = new Date(Date.UTC(nowWeek.getUTCFullYear(), nowWeek.getUTCMonth(), nowWeek.getUTCDate(), 23, 59, 59, 999));
            const weekStart = new Date(nowWeek.getTime() - (6 * 24 * 60 * 60 * 1000)); // 6 días atrás + hoy = 7 días
            calculatedStart = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate(), 0, 0, 0, 0));
            break;
          case 'mes':
            // Para período de mes, usar las últimas 4 semanas (28 días completos) en UTC
            const nowMonth = new Date();
            calculatedEnd = new Date(Date.UTC(nowMonth.getUTCFullYear(), nowMonth.getUTCMonth(), nowMonth.getUTCDate(), 23, 59, 59, 999));
            const monthStart = new Date(nowMonth.getTime() - (27 * 24 * 60 * 60 * 1000)); // 27 días atrás + hoy = 28 días
            calculatedStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate(), 0, 0, 0, 0));
            break;
          case 'año':
            // Para período de año, usar los últimos 12 meses completos en UTC
            const nowYear = new Date();
            calculatedEnd = new Date(Date.UTC(nowYear.getUTCFullYear(), nowYear.getUTCMonth(), nowYear.getUTCDate(), 23, 59, 59, 999));
            const yearStart = new Date(nowYear.getUTCFullYear() - 1, nowYear.getUTCMonth(), nowYear.getUTCDate());
            calculatedStart = new Date(Date.UTC(yearStart.getUTCFullYear(), yearStart.getUTCMonth(), yearStart.getUTCDate(), 0, 0, 0, 0));
            break;
          default:
            calculatedEnd = now;
            calculatedStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        }

        console.log('📅 Fechas calculadas por período:', {
          timePeriod,
          start: calculatedStart.toISOString(),
          end: calculatedEnd.toISOString()
        });
      }

      // Construir query base para usuarios
      const userQuery = this.buildUserQuery({
        startDate: calculatedStart.toISOString().split('T')[0],
        endDate: calculatedEnd.toISOString().split('T')[0],
        country,
        ageBucket,
        gender
      });

      // Construir query para yerbas
      const yerbaQuery = this.buildYerbaQuery({
        tipoYerba,
        marca,
        origen,
        paisProd,
        secado
      });

      // Obtener usuarios con catas en el período
      const usersWithTasting = await this.getUsersWithTasting(userQuery, calculatedStart, calculatedEnd);
      
      // Calcular métricas principales
      const usersWithTasting30d = usersWithTasting.length;
      
      // Calcular tasa de descubrimiento
      // Pasar el filtro de yerba para que la tasa de descubrimiento se calcule
      // sólo sobre los eventos relacionados con las yerbas que cumplen el filtro (tipo, marca, etc.).
      const discoveryData = await this.getDiscoveryRate(userQuery, calculatedStart, calculatedEnd, yerbaQuery);
      
      // Calcular eventos de descubrimiento específicos
      const discoveryEvents = await this.getDiscoveryEvents(userQuery, calculatedStart, calculatedEnd, yerbaQuery);
      
      // Obtener actividad temporal con granularidad dinámica
      const temporalActivity = await this.getTemporalActivity(
        userQuery, 
        calculatedStart, 
        calculatedEnd, 
        timePeriod,
        yerbaQuery  // Pasar el filtro de yerba
      );
      
      // Obtener distribución por tipos
      console.log('\n🎯 === LLAMANDO A getTypeBreakdown ===');
      console.log('📅 Con fechas calculadas:', {
        start: calculatedStart.toISOString(),
        end: calculatedEnd.toISOString()
      });
      const typeBreakdown = await this.getTypeBreakdown(userQuery, yerbaQuery, calculatedStart, calculatedEnd);
      console.log('🎯 === RESULTADO DE getTypeBreakdown ===');
      console.log('📊 TypeBreakdown recibido:', typeBreakdown);
      console.log('=======================================\n');
      
      // Obtener principales movimientos
      const topMovers = await this.getTopMovers(userQuery, yerbaQuery, calculatedStart, calculatedEnd);

      // Información de la muestra
      const sample = await this.getSampleInfo(userQuery, calculatedStart, calculatedEnd);

      return {
        usersWithTasting30d,
        discoveryRate: discoveryData.rate,
        discoveryDeltaPp: discoveryData.deltaPp,
        discoveryEvents, // Agregar eventos de descubrimiento específicos
        weeklyActivity: temporalActivity.data, // Mantener nombre por compatibilidad
        temporalActivity: temporalActivity, // Nueva estructura
        typeBreakdown,
        topMovers,
        sample,
        activeUsers: sample.activeUsers || 0 // Agregar usuarios activos a nivel raíz
      };

    } catch (error) {
      console.error('Error getting overview data:', error);
      throw new Error('Error obteniendo datos del overview');
    }
  }

  /**
   * Construye query para filtrar usuarios
   */
  buildUserQuery(filters) {
    const query = {};
    
    if (filters.country) {
      query.nacionalidad = filters.country;
    }
    
    if (filters.ageBucket) {
      const [minAge, maxAge] = this.parseAgeBucket(filters.ageBucket);
      // Calcular edad basada en fechaNacimiento
      const currentYear = new Date().getFullYear();
      const maxBirthYear = currentYear - minAge;
      const minBirthYear = currentYear - maxAge;
      
      query.fechaNacimiento = {
        $gte: `${minBirthYear}-01-01`,
        $lte: `${maxBirthYear}-12-31`
      };
    }
    
    if (filters.gender) {
      query.genero = filters.gender;
    }

    return query;
  }

  /**
   * Construye query para filtrar yerbas
   */
  buildYerbaQuery(filters) {
    const query = {};
    
    if (filters.tipoYerba) query.tipo = filters.tipoYerba;
    if (filters.marca) query.marca = filters.marca;
    if (filters.origen) query.origen = filters.origen;
    if (filters.paisProd) query.pais = filters.paisProd;
    if (filters.secado) query.secado = filters.secado;
    if (filters.establecimiento) query.establecimiento = filters.establecimiento;
    if (filters.containsPalo) query.containsPalo = filters.containsPalo;
    if (filters.leafCut) query.leafCut = filters.leafCut;
    if (filters.tipoEstacionamiento) query.tipoEstacionamiento = filters.tipoEstacionamiento;
    if (filters.tiempoEstacionamiento) query.tiempoEstacionamiento = filters.tiempoEstacionamiento;
    if (filters.produccion) query.produccion = filters.produccion;

    return query;
  }

  /**
   * Parsea rango de edad del formato "18-25" a [18, 25]
   */
  parseAgeBucket(ageBucket) {
    if (ageBucket === '56+') return [56, 100];
    const [min, max] = ageBucket.split('-').map(Number);
    return [min, max];
  }

  /**
   * Obtiene usuarios que han realizado catas en el período
   */
  async getUsersWithTasting(userQuery, startDate, endDate) {
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = { ...userQuery };
    
    // Buscar usuarios que tienen items en shelf con status 'probada'
    query['shelf.status'] = 'probada';
    
    if (Object.keys(dateFilter).length > 0) {
      query['shelf.addedAt'] = dateFilter;
    }

    return await User.find(query).distinct('_id');
  }

  /**
   * Calcula la tasa de descubrimiento
   * Ahora acepta un cuarto parámetro opcional `yerbaQuery` para filtrar por yerbas específicas.
   */
  async getDiscoveryRate(userQuery, startDate, endDate, yerbaQuery = {}) {
     try {
       // Obtener usuarios con catas en el período
      const usersWithTasting = await this.getUsersWithTasting(userQuery, startDate, endDate);
      
      if (usersWithTasting.length === 0) {
        return { rate: 0, deltaPp: 0 };
      }

      // Si se proporciona un filtro de yerba (tipo/marca/origen/etc.), obtener los IDs de yerbas
      // que cumplen ese filtro para poder limitar el cálculo a esos items.
      let allowedYerbaIds = null;
      if (yerbaQuery && Object.keys(yerbaQuery).length > 0) {
        try {
          allowedYerbaIds = await Yerba.find(yerbaQuery).distinct('_id');
          allowedYerbaIds = allowedYerbaIds.map(id => id.toString());
        } catch (err) {
          console.warn('⚠️ getDiscoveryRate - Error obteniendo yerbas permitidas por filtro, ignorando filtro:', err.message);
          allowedYerbaIds = null;
        }
      }
      
      let usersWithDiscovery = 0;
      let denominatorUsers = 0; // usuarios que tuvieron al menos un evento relevante (según yerbaQuery)
      
      for (const userId of usersWithTasting) {
        const user = await User.findById(userId);
        if (!user || !user.shelf) continue;

        // Filtrar items probados en el período
        let itemsEnPeriodo = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' &&
                 (!startDate || fechaItem >= startDate) &&
                 (!endDate || fechaItem <= endDate);
        });

        // Si hay un filtro de yerbas, limitar los items a los IDs permitidos
        if (allowedYerbaIds) {
          itemsEnPeriodo = itemsEnPeriodo.filter(item => allowedYerbaIds.includes((item.yerba || '').toString()));
        }

        // Si el usuario no tuvo eventos relevantes para el filtro, no cuenta en el denominador
        if (!itemsEnPeriodo || itemsEnPeriodo.length === 0) continue;
        denominatorUsers++;

        // Obtener yerbas únicas probadas en el período (según filtro)
        const yerbasEnPeriodo = [...new Set(itemsEnPeriodo.map(item => item.yerba?.toString()))];

        // Obtener yerbas probadas antes del período (también limitadas por filtro si existe)
        let itemsAnteriores = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' && startDate && fechaItem < startDate;
        });
        if (allowedYerbaIds) {
          itemsAnteriores = itemsAnteriores.filter(item => allowedYerbaIds.includes((item.yerba || '').toString()));
        }
        const yerbasAnteriores = new Set(itemsAnteriores.map(item => item.yerba?.toString()));

        // Verificar si probó alguna yerba nueva (dentro del filtro)
        const hayNuevas = yerbasEnPeriodo.some(yerbaId => !yerbasAnteriores.has(yerbaId));
        if (hayNuevas) {
          usersWithDiscovery++;
        }
      }

      // Evitar división por cero
      const rate = denominatorUsers > 0 ? usersWithDiscovery / denominatorUsers : 0;
      
      // TODO: Calcular delta comparando con período anterior
      const deltaPp = 0; // Placeholder

      return { rate, deltaPp };
     } catch (error) {
       console.error('Error calculating discovery rate:', error);
       return { rate: 0, deltaPp: 0 };
     }
   }

  /**
   * Obtiene actividad semanal
   */
  async getWeeklyActivity(userQuery, startDate, endDate) {
    try {
      const weeks = this.generateWeeklyPeriods(startDate, endDate);
      const weeklyData = [];

      for (const week of weeks) {
        const events = await this.getEventsInPeriod(userQuery, week.start, week.end);
        weeklyData.push({
          week: week.start.toISOString().split('T')[0],
          events
        });
      }

      return weeklyData;

    } catch (error) {
      console.error('Error getting weekly activity:', error);
      return [];
    }
  }

  /**
   * Genera períodos semanales
   */
  generateWeeklyPeriods(startDate, endDate) {
    const periods = [];
    const start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = new Date(endDate || new Date());

    let current = new Date(start);
    
    while (current < end) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      periods.push({
        start: new Date(current),
        end: weekEnd > end ? end : weekEnd
      });
      
      current.setDate(current.getDate() + 7);
    }

    return periods;
  }

  /**
   * Cuenta eventos (catas) en un período específico
   */
  async getEventsInPeriod(userQuery, startDate, endDate) {
    try {
      console.log('🔍 getEventsInPeriod - Calculando eventos del período:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userQuery
      });

      let totalEvents = 0;

      // 1. Contar reviews (comentarios/puntuaciones en yerbas)
      const reviewsAggregate = await Yerba.aggregate([
        { $unwind: '$reviews' },
        { 
          $match: {
            'reviews.createdAt': { $gte: startDate, $lte: endDate }
          }
        },
        { $count: 'total' }
      ]);
      const reviewsCount = reviewsAggregate[0]?.total || 0;
      totalEvents += reviewsCount;
      console.log(`📝 Reviews en período: ${reviewsCount}`);

      // 2. Contar respuestas (replies) a reviews
      const repliesAggregate = await Yerba.aggregate([
        { $unwind: '$reviews' },
        { $unwind: '$reviews.replies' },
        { 
          $match: {
            'reviews.replies.createdAt': { $gte: startDate, $lte: endDate }
          }
        },
        { $count: 'total' }
      ]);
      const repliesCount = repliesAggregate[0]?.total || 0;
      totalEvents += repliesCount;
      console.log(`💬 Respuestas en período: ${repliesCount}`);

      // 3. Contar items del shelf (yerbas probadas)
      const users = await User.find({
        ...userQuery,
        'shelf.addedAt': {
          $gte: startDate,
          $lte: endDate
        },
        'shelf.status': 'probada'
      });

      let shelfEvents = 0;
      for (const user of users) {
        if (user.shelf) {
          const eventsInPeriod = user.shelf.filter(item => {
            const fecha = new Date(item.addedAt);
            return item.status === 'probada' && fecha >= startDate && fecha <= endDate;
          });
          shelfEvents += eventsInPeriod.length;
        }
      }
      totalEvents += shelfEvents;
      console.log(`🏷️ Items shelf probados en período: ${shelfEvents}`);

      console.log(`📊 Total eventos en período: ${totalEvents} (reviews: ${reviewsCount}, respuestas: ${repliesCount}, shelf: ${shelfEvents})`);
      
      return totalEvents;
    } catch (error) {
      console.error('❌ Error en getEventsInPeriod:', error);
      return 0;
    }
  }

  /**
   * Cuenta eventos (catas) en un período específico con filtros de yerba
   */
  async getEventsInPeriodWithYerbas(userQuery, yerbaQuery, startDate, endDate) {
    try {
      console.log('🔍 getEventsInPeriodWithYerbas - Calculando eventos del período:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userQuery,
        yerbaQuery
      });

      let totalEvents = 0;

      // 1. Contar reviews (comentarios/puntuaciones en yerbas) con filtro de yerba
      const reviewsMatchStage = {
        'reviews.createdAt': { $gte: startDate, $lte: endDate }
      };
      
      // Aplicar filtros de yerba si existen
      if (Object.keys(yerbaQuery).length > 0) {
        Object.assign(reviewsMatchStage, yerbaQuery);
      }

      const reviewsAggregate = await Yerba.aggregate([
        { $match: yerbaQuery }, // Filtrar yerbas primero
        { $unwind: '$reviews' },
        { $match: reviewsMatchStage },
        { $count: 'total' }
      ]);
      
      const reviewsCount = reviewsAggregate[0]?.total || 0;
      totalEvents += reviewsCount;
      console.log(`📝 Reviews en período (con filtros): ${reviewsCount}`);

      // 2. Contar respuestas (replies) a reviews con filtro de yerba
      const repliesAggregate = await Yerba.aggregate([
        { $match: yerbaQuery }, // Filtrar yerbas primero
        { $unwind: '$reviews' },
        { $unwind: '$reviews.replies' },
        { 
          $match: {
            'reviews.replies.createdAt': { $gte: startDate, $lte: endDate }
          }
        },
        { $count: 'total' }
      ]);
      
      const repliesCount = repliesAggregate[0]?.total || 0;
      totalEvents += repliesCount;
      console.log(`💬 Respuestas en período (con filtros): ${repliesCount}`);

      // 3. Contar items del shelf (yerbas probadas) con filtros de yerba
      let shelfEvents = 0;
      
      if (Object.keys(yerbaQuery).length > 0) {
        // Si hay filtros de yerba, necesitamos hacer un lookup con las yerbas filtradas
        const filteredYerbas = await Yerba.find(yerbaQuery).distinct('_id');
        
        if (filteredYerbas.length > 0) {
          const users = await User.find({
            ...userQuery,
            'shelf.addedAt': {
              $gte: startDate,
              $lte: endDate
            },
            'shelf.status': 'probada',
            'shelf.yerba': { $in: filteredYerbas }
          });

          for (const user of users) {
            if (user.shelf) {
              const eventsInPeriod = user.shelf.filter(item => {
                const fecha = new Date(item.addedAt);
                const yerbaId = item.yerba?.toString();
                return item.status === 'probada' && 
                       fecha >= startDate && 
                       fecha <= endDate &&
                       filteredYerbas.some(id => id.toString() === yerbaId);
              });
              shelfEvents += eventsInPeriod.length;
            }
          }
        }
      } else {
        // Sin filtros de yerba, contar todos los eventos de shelf
        const users = await User.find({
          ...userQuery,
          'shelf.addedAt': {
            $gte: startDate,
            $lte: endDate
          },
          'shelf.status': 'probada'
        });

        for (const user of users) {
          if (user.shelf) {
            const eventsInPeriod = user.shelf.filter(item => {
              const fecha = new Date(item.addedAt);
              return item.status === 'probada' && fecha >= startDate && fecha <= endDate;
            });
            shelfEvents += eventsInPeriod.length;
          }
        }
      }
      
      totalEvents += shelfEvents;
      console.log(`🏷️ Items shelf probados en período (con filtros): ${shelfEvents}`);

      console.log(`📊 Total eventos en período con filtros: ${totalEvents} (reviews: ${reviewsCount}, respuestas: ${repliesCount}, shelf: ${shelfEvents})`);
      
      return totalEvents;
    } catch (error) {
      console.error('❌ Error en getEventsInPeriodWithYerbas:', error);
      return 0;
    }
  }

  /**
   * Obtiene actividad temporal con granularidad dinámica
   */
  async getTemporalActivity(userQuery, startDate, endDate, timePeriod = 'mes', yerbaQuery = {}) {
    try {
      // Determinar la granularidad basada en el período seleccionado
      let granularity;
      let periodLabel;
      
      switch (timePeriod) {
        case 'dia':
          // Para período de día, usar granularidad por hora para mostrar el día completo por horas
          granularity = 'hour';
          periodLabel = 'Actividad por Hora';
          break;
        case 'semana':
          // Para período de semana, usar granularidad por día (últimos 7 días)
          granularity = 'day';
          periodLabel = 'Actividad por Día';
          break;
        case 'mes':
          // Para período de mes, usar granularidad por semana
          granularity = 'week';
          periodLabel = 'Actividad por Semana';
          break;
        case 'año':
          // Para período de año, usar granularidad por mes
          granularity = 'month';
          periodLabel = 'Actividad por Mes';
          break;
        default:
          granularity = 'week';
          periodLabel = 'Actividad por Semana';
      }

      console.log(`📊 Generando actividad temporal: ${granularity} para período ${timePeriod}`);
      console.log(`📅 Rango de fechas: ${startDate} a ${endDate}`);
      console.log(`🎯 Query de yerbas:`, yerbaQuery);

      const periods = this.generateTemporalPeriods(startDate, endDate, granularity);
      const temporalData = [];

      console.log(`📈 Períodos generados: ${periods.length}`);

      for (const period of periods) {
        const events = await this.getEventsInPeriodWithYerbas(userQuery, yerbaQuery, period.start, period.end);
        
        // Crear objeto de datos con formato consistente
        const periodData = {
          period: period.period, // Campo principal para el frontend
          events,
          // Campos para compatibilidad con el frontend existente
          week: period.period,
          // Campos adicionales para debugging
          start: period.start.toISOString(),
          end: period.end.toISOString(),
          label: period.label,
          _debug: {
            granularity,
            timePeriod,
            originalStart: startDate,
            originalEnd: endDate,
            yerbaQuery
          }
        };
        
        temporalData.push(periodData);
        
        console.log(`📊 Período ${period.period}: ${events} eventos`);
      }

      console.log(`✅ Datos temporales generados:`, temporalData);

      return {
        data: temporalData,
        granularity,
        periodLabel,
        timePeriod,
        // Metadatos adicionales para debugging
        _meta: {
          totalPeriods: temporalData.length,
          totalEvents: temporalData.reduce((sum, p) => sum + p.events, 0),
          dateRange: { start: startDate, end: endDate },
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Error getting temporal activity:', error);
      return {
        data: [],
        granularity: 'week',
        periodLabel: 'Actividad',
        timePeriod: timePeriod || 'mes',
        _meta: {
          error: error.message,
          totalPeriods: 0,
          totalEvents: 0,
          generatedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Genera períodos temporales con granularidad específica
   */
  generateTemporalPeriods(startDate, endDate, granularity) {
    const periods = [];
    let start, end;
    
    // Usar el rango de fechas proporcionado o fechas por defecto
    start = new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    end = new Date(endDate || new Date());

    // Si la granularidad es 'day' y las fechas son del mismo día, generar un solo período
    if (granularity === 'day' && startDate && endDate) {
      const startDay = new Date(startDate);
      const endDay = new Date(endDate);
      
      // Si las fechas son del mismo día, generar un solo período
      if (startDay.toDateString() === endDay.toDateString()) {
        const periodKey = startDay.toISOString().split('T')[0];
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const label = `${dayNames[startDay.getDay()]} ${startDay.toLocaleDateString('es-AR', { 
          day: '2-digit', 
          month: '2-digit' 
        })}`;
        
        periods.push({
          start: startDay,
          end: new Date(startDay.getTime() + 24 * 60 * 60 * 1000), // Fin del día
          label,
          period: periodKey,
          week: periodKey,
          _debug: {
            granularity,
            originalStart: startDate,
            originalEnd: endDate,
            singleDay: true
          }
        });
        
        console.log(`📅 Generando período único para día: ${periodKey}`);
        return periods;
      }
    }

    // Si la granularidad es 'week' y las fechas son del mismo mes, generar períodos por semana
    if (granularity === 'week' && startDate && endDate) {
      const startMonth = new Date(startDate);
      const endMonth = new Date(endDate);
      
      // Si las fechas son del mismo mes o rango de ~4 semanas, generar períodos por semana
      const timeDiff = endMonth.getTime() - startMonth.getTime();
      const weeksDiff = timeDiff / (1000 * 60 * 60 * 24 * 7);
      
      if (weeksDiff <= 5) {
        let currentWeek = new Date(startMonth);
        
        while (currentWeek < endMonth) {
          const periodEnd = new Date(currentWeek.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 días
          const periodKey = currentWeek.toISOString().split('T')[0];
          const label = `Sem ${currentWeek.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
          })}`;
          
          periods.push({
            start: new Date(currentWeek),
            end: periodEnd > endMonth ? endMonth : periodEnd,
            label,
            period: periodKey,
            week: periodKey,
            _debug: {
              granularity,
              originalStart: startDate,
              originalEnd: endDate,
              singleWeek: true
            }
          });
          
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
        
        console.log(`📅 Generando ${periods.length} períodos por semana para rango de ${weeksDiff.toFixed(1)} semanas`);
        return periods;
      }
    }

    let current = new Date(start);
    
    while (current < end) {
      let periodEnd = new Date(current);
      let label;
      let periodKey; // Clave única para el período
      
      switch (granularity) {
        case 'hour':
          periodEnd.setHours(periodEnd.getHours() + 1);
          // Usar formato ISO para consistencia
          periodKey = current.toISOString();
          label = current.toLocaleString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit',
            minute: '2-digit'
          });
          break;
        case 'day':
          periodEnd.setDate(periodEnd.getDate() + 1);
          // Usar formato YYYY-MM-DD para consistencia
          periodKey = current.toISOString().split('T')[0];
          // Para días, mostrar nombre del día + fecha
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          label = `${dayNames[current.getDay()]} ${current.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
          })}`;
          break;
        case 'week':
          periodEnd.setDate(periodEnd.getDate() + 7);
          // Usar formato YYYY-MM-DD para consistencia
          periodKey = current.toISOString().split('T')[0];
          label = `Sem ${current.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
          })}`;
          break;
        case 'month':
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          // Usar formato YYYY-MM para consistencia
          periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          label = current.toLocaleDateString('es-AR', { 
            month: 'short', 
            year: 'numeric' 
          });
          break;
        default:
          periodEnd.setDate(periodEnd.getDate() + 7);
          // Usar formato YYYY-MM-DD para consistencia
          periodKey = current.toISOString().split('T')[0];
          label = `Sem ${current.toLocaleDateString('es-AR')}`;
      }
      
      periods.push({
        start: new Date(current),
        end: periodEnd > end ? end : periodEnd,
        label,
        period: periodKey, // Campo principal para el frontend
        // Campos para compatibilidad con el frontend existente
        week: periodKey,
        // Campos adicionales para debugging
        _debug: {
          granularity,
          originalStart: startDate,
          originalEnd: endDate
        }
      });
      
      // Avanzar al siguiente período
      switch (granularity) {
        case 'hour':
          current.setHours(current.getHours() + 1);
          break;
        case 'day':
          current.setDate(current.getDate() + 1);
          break;
        case 'week':
          current.setDate(current.getDate() + 7);
          break;
        case 'month':
          current.setMonth(current.getMonth() + 1);
          break;
        default:
          current.setDate(current.getDate() + 7);
      }
    }

    console.log(`📊 Períodos generados para granularidad ${granularity}: ${periods.length}`);
    return periods;
  }

  /**
   * Obtiene distribución por tipos de yerba
   */
  async getTypeBreakdown(userQuery, yerbaQuery, startDate, endDate) {
    try {
      console.log('\n🔍 ===== INICIO getTypeBreakdown =====');
      console.log('📅 Filtros de fecha:', { 
        startDate: startDate?.toISOString(), 
        endDate: endDate?.toISOString(),
        startDateLocal: startDate?.toLocaleDateString(),
        endDateLocal: endDate?.toLocaleDateString()
      });
      console.log('👥 Filtros de usuario:', userQuery);
      console.log('🌿 Filtros de yerba:', yerbaQuery);

      // Obtener todas las yerbas que coinciden con los filtros
      const yerbas = await Yerba.find(yerbaQuery);
      console.log(`📊 Total yerbas encontradas: ${yerbas.length}`);
      
      if (yerbas.length === 0) {
        console.log('⚠️ No se encontraron yerbas con los filtros aplicados');
        return [];
      }

      const yerbasByType = {};
      
      // Agrupar por tipo
      yerbas.forEach(yerba => {
        const tipo = yerba.tipo || 'Sin clasificar';
        if (!yerbasByType[tipo]) {
          yerbasByType[tipo] = [];
        }
        yerbasByType[tipo].push(yerba._id.toString());
      });

      console.log('🏷️ Yerbas agrupadas por tipo:', yerbasByType);

      const typeBreakdown = [];
      let totalCatas = 0;

      // Contar catas por tipo en el período especificado
      for (const [tipo, yerbaIds] of Object.entries(yerbasByType)) {
        console.log(`\n🔍 Analizando tipo: ${tipo} (${yerbaIds.length} yerbas)`);
        
        const catas = await this.getCatasForYerbas(userQuery, yerbaIds, startDate, endDate);
        console.log(`📊 Catas encontradas para ${tipo}: ${catas}`);
        
        if (catas > 0) {
          typeBreakdown.push({
            label: tipo,
            count: catas,
            share: 0, // Se calculará después
            period: 'current'
          });
          totalCatas += catas;
        }
      }

      console.log(`\n📈 RESULTADO CRÍTICO: Total de catas encontradas en período: ${totalCatas}`);
      console.log(`📊 Detalle por tipo:`, typeBreakdown.map(t => `${t.label}: ${t.count}`).join(', '));

      // LÓGICA GARANTIZADA: Siempre mostrar datos del período actual sin importar la cantidad
      // Solo usar datos históricos cuando NO HAY DATOS EN ABSOLUTO (totalCatas === 0)
      
      if (totalCatas === 0) {
        console.log('⚠️ No hay catas en el período especificado - NO HAY DATOS EN ABSOLUTO');
        console.log('🔄 Obteniendo datos históricos como referencia...');
        
        const allTimeBreakdown = [];
        let totalCatasAllTime = 0;
        
        for (const [tipo, yerbaIds] of Object.entries(yerbasByType)) {
          const catasAllTime = await this.getCatasForYerbas(userQuery, yerbaIds, null, null);
          console.log(`📊 Catas históricas para ${tipo}: ${catasAllTime}`);
          
          if (catasAllTime > 0) {
            allTimeBreakdown.push({
              label: tipo,
              count: catasAllTime,
              share: 0,
              period: 'all-time',
              note: 'Datos históricos (sin datos en el período seleccionado)'
            });
            totalCatasAllTime += catasAllTime;
          }
        }

        // Si hay datos históricos, calcular porcentajes y retornar
        if (totalCatasAllTime > 0) {
          console.log(`📊 Total catas históricas: ${totalCatasAllTime}`);
          
          allTimeBreakdown.forEach(item => {
            item.share = (item.count / totalCatasAllTime) * 100;
          });

          const sortedAllTime = allTimeBreakdown.sort((a, b) => b.count - a.count);
          console.log('✅ Usando datos históricos (sin datos en período actual)');
          return sortedAllTime;
        }
        
        // Si no hay datos históricos tampoco, retornar array vacío
        console.log('⚠️ No hay datos ni en el período ni históricamente');
        return [];
      }

      // HAY DATOS EN EL PERÍODO: calcular porcentajes y retornar SIEMPRE
      console.log(`✅ USANDO DATOS DEL PERÍODO SELECCIONADO - Total catas: ${totalCatas}`);
      console.log('📊 No importa si son pocos datos, se muestran los datos reales del período');
      
      typeBreakdown.forEach(item => {
        item.share = (item.count / totalCatas) * 100;
        item.period = 'current';
      });

      const result = typeBreakdown.sort((a, b) => b.count - a.count);
      console.log('\n✅ ===== RESULTADO FINAL getTypeBreakdown =====');
      console.log('📊 Datos del período seleccionado:', result);
      console.log('==================================================\n');
      
      return result;

    } catch (error) {
      console.error('❌ Error getting type breakdown:', error);
      return [];
    }
  }

  /**
   * Cuenta catas para un conjunto de yerbas
   */
  async getCatasForYerbas(userQuery, yerbaIds, startDate, endDate) {
    try {
      console.log(`🔍 getCatasForYerbas - Analizando ${yerbaIds.length} yerbas`);
      console.log(`📅 Filtros de fecha: ${startDate ? startDate.toISOString() : 'Sin inicio'} a ${endDate ? endDate.toISOString() : 'Sin fin'}`);
      
      const users = await User.find(userQuery);
      console.log(`👥 Usuarios encontrados: ${users.length}`);
      
      let count = 0;
      let usersWithValidShelf = 0;
      let totalItemsChecked = 0;

      for (const user of users) {
        if (!user.shelf || user.shelf.length === 0) continue;
        
        usersWithValidShelf++;
        const items = user.shelf.filter(item => {
          totalItemsChecked++;
          
          // Verificar que el item tenga yerba
          if (!item.yerba) return false;
          
          // Verificar status
          const statusOk = item.status === 'probada';
          if (!statusOk) return false;
          
          // Verificar fecha si se proporciona
          let fechaOk = true;
          if (startDate || endDate) {
            if (!item.addedAt) {
              fechaOk = false;
            } else {
              const fechaItem = new Date(item.addedAt);
              if (startDate && fechaItem < startDate) fechaOk = false;
              if (endDate && fechaItem > endDate) fechaOk = false;
            }
          }
          
          // Verificar que la yerba esté en la lista
          const yerbaOk = yerbaIds.includes(item.yerba.toString());
          
          return fechaOk && yerbaOk;
        });
        
        count += items.length;
        
        if (items.length > 0) {
          console.log(`  👤 Usuario ${user._id}: ${items.length} catas válidas`);
        }
      }

      console.log(`📊 Resumen getCatasForYerbas:`);
      console.log(`  - Usuarios con shelf válido: ${usersWithValidShelf}`);
      console.log(`  - Total items revisados: ${totalItemsChecked}`);
      console.log(`  - Catas encontradas: ${count}`);
      
      return count;
      
    } catch (error) {
      console.error('❌ Error en getCatasForYerbas:', error);
      return 0;
    }
  }

  /**
   * Obtiene principales movimientos (cambios en popularidad)
   * Basado en actividad real: reviews, likes, respuestas
   */
  async getTopMovers(userQuery, yerbaQuery, startDate, endDate) {
    try {
      console.log('🔍 getTopMovers - Calculando cambios reales en popularidad basados en reviews...');
      console.log('📅 Filtros de fecha:', { startDate, endDate });
      
      // Si no hay fechas, no podemos calcular cambios
      if (!startDate || !endDate) {
        console.log('⚠️ No se pueden calcular cambios sin fechas de inicio y fin');
        return [];
      }

      // Calcular período anterior para comparación
      const periodDuration = endDate.getTime() - startDate.getTime();
      const previousStart = new Date(startDate.getTime() - periodDuration);
      const previousEnd = new Date(startDate.getTime());
      
      console.log('📊 Períodos de comparación:');
      console.log(`  - Período actual: ${startDate.toISOString()} a ${endDate.toISOString()}`);
      console.log(`  - Período anterior: ${previousStart.toISOString()} a ${previousEnd.toISOString()}`);

      // Pipeline para obtener actividad de reviews en período actual
      const currentActivityPipeline = [
        // Filtrar yerbas según criterios
        ...(Object.keys(yerbaQuery).length > 0 ? [{ $match: yerbaQuery }] : []),
        
        // Desenrollar reviews
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
        
        // Filtrar reviews en el período actual
        {
          $match: {
            'reviews.createdAt': {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        
        // Calcular score de actividad por yerba
        {
          $group: {
            _id: '$_id',
            nombre: { $first: '$nombre' },
            marca: { $first: '$marca' },
            reviewsCount: { $sum: 1 },
            avgRating: { $avg: '$reviews.score' },
            totalLikes: {
              $sum: {
                $cond: {
                  if: { $isArray: '$reviews.likes' },
                  then: { $size: '$reviews.likes' },
                  else: 0
                }
              }
            },
            totalReplies: {
              $sum: {
                $cond: {
                  if: { $isArray: '$reviews.replies' },
                  then: { $size: '$reviews.replies' },
                  else: 0
                }
              }
            }
          }
        },
        
        // Calcular score de popularidad
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $multiply: ['$reviewsCount', 10] }, // 10 puntos por review
                { $multiply: ['$totalLikes', 2] }, // 2 puntos por like
                { $multiply: ['$totalReplies', 3] }, // 3 puntos por respuesta
                { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] } // 5 puntos por punto de rating
              ]
            }
          }
        }
      ];
      
      // Pipeline para período anterior (mismo pero con fechas diferentes)
      const previousActivityPipeline = [
        // Filtrar yerbas según criterios
        ...(Object.keys(yerbaQuery).length > 0 ? [{ $match: yerbaQuery }] : []),
        
        // Desenrollar reviews
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
        
        // Filtrar reviews en el período anterior
        {
          $match: {
            'reviews.createdAt': {
              $gte: previousStart,
              $lte: previousEnd
            }
          }
        },
        
        // Calcular score de actividad por yerba
        {
          $group: {
            _id: '$_id',
            nombre: { $first: '$nombre' },
            marca: { $first: '$marca' },
            reviewsCount: { $sum: 1 },
            avgRating: { $avg: '$reviews.score' },
            totalLikes: {
              $sum: {
                $cond: {
                  if: { $isArray: '$reviews.likes' },
                  then: { $size: '$reviews.likes' },
                  else: 0
                }
              }
            },
            totalReplies: {
              $sum: {
                $cond: {
                  if: { $isArray: '$reviews.replies' },
                  then: { $size: '$reviews.replies' },
                  else: 0
                }
              }
            }
          }
        },
        
        // Calcular score de popularidad
        {
          $addFields: {
            popularityScore: {
              $add: [
                { $multiply: ['$reviewsCount', 10] }, // 10 puntos por review
                { $multiply: ['$totalLikes', 2] }, // 2 puntos por like
                { $multiply: ['$totalReplies', 3] }, // 3 puntos por respuesta
                { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] } // 5 puntos por punto de rating
              ]
            }
          }
        }
      ];

      // Ejecutar ambos pipelines
      const [currentActivity, previousActivity] = await Promise.all([
        Yerba.aggregate(currentActivityPipeline),
        Yerba.aggregate(previousActivityPipeline)
      ]);

      console.log(`📊 Yerbas con actividad actual: ${currentActivity.length}`);
      console.log(`📊 Yerbas con actividad anterior: ${previousActivity.length}`);

      // Crear mapa de actividad anterior para comparación fácil
      const previousActivityMap = {};
      previousActivity.forEach(yerba => {
        previousActivityMap[yerba._id.toString()] = yerba;
      });

      const topMovers = [];
      let totalCurrentScore = 0;
      let totalPreviousScore = 0;

      // Analizar cada yerba con actividad actual
      currentActivity.forEach(currentYerba => {
        const yerbaId = currentYerba._id.toString();
        const previousYerba = previousActivityMap[yerbaId] || {
          popularityScore: 0,
          reviewsCount: 0,
          totalLikes: 0,
          totalReplies: 0,
          avgRating: 0
        };

        const currentScore = currentYerba.popularityScore || 0;
        const previousScore = previousYerba.popularityScore || 0;
        
        totalCurrentScore += currentScore;
        totalPreviousScore += previousScore;

        console.log(`\n🔍 ${currentYerba.marca} ${currentYerba.nombre}:`);
        console.log(`  📊 Score actual: ${currentScore} (${currentYerba.reviewsCount} reviews, ${currentYerba.totalLikes} likes, ${currentYerba.totalReplies} respuestas)`);
        console.log(`  📊 Score anterior: ${previousScore} (${previousYerba.reviewsCount} reviews, ${previousYerba.totalLikes} likes, ${previousYerba.totalReplies} respuestas)`);

        // Calcular cambio porcentual y tipo
        let deltaPct = 0;
        let changeType = 'stable';
        
        if (previousScore > 0 && currentScore > 0) {
          // Actividad en ambos períodos
          deltaPct = ((currentScore - previousScore) / previousScore) * 100;
          // Limitar el cambio a un rango razonable (-200% a +200%)
          deltaPct = Math.max(-200, Math.min(200, deltaPct));
          changeType = deltaPct > 5 ? 'increasing' : deltaPct < -5 ? 'decreasing' : 'stable';
        } else if (currentScore > 0 && previousScore === 0) {
          // Nueva actividad
          deltaPct = 100; // 100% de incremento para nuevas yerbas con actividad
          changeType = 'new';
        } else if (currentScore === 0 && previousScore > 0) {
          // Pérdida de actividad
          deltaPct = -100; // 100% de decremento para yerbas que perdieron actividad
          changeType = 'inactive';
        }

        // Solo incluir yerbas con actividad significativa o cambios importantes
        if (currentScore > 0 || previousScore > 0) {
          console.log(`  📈 Cambio: ${deltaPct.toFixed(1)}% (${changeType})`);

          // Validar que los datos estén completos antes de añadir
          const isValidEntry = currentYerba.marca && 
                              currentYerba.nombre && 
                              changeType && 
                              !isNaN(deltaPct) && 
                              !isNaN(currentScore);

          if (isValidEntry) {
            topMovers.push({
              label: `${currentYerba.marca} ${currentYerba.nombre}`,
              yerbaName: currentYerba.nombre,
              yerbaType: currentYerba.marca,
              deltaPct: parseFloat(deltaPct.toFixed(1)),
              currentScore: parseFloat(currentScore.toFixed(1)),
              previousScore: parseFloat(previousScore.toFixed(1)),
              currentInteractions: currentYerba.reviewsCount + currentYerba.totalLikes + currentYerba.totalReplies,
              previousInteractions: previousYerba.reviewsCount + previousYerba.totalLikes + previousYerba.totalReplies,
              changeType,
              yerbaId: yerbaId,
              // Datos adicionales para análisis
              currentReviews: currentYerba.reviewsCount,
              previousReviews: previousYerba.reviewsCount,
              currentLikes: currentYerba.totalLikes,
              previousLikes: previousYerba.totalLikes,
              currentReplies: currentYerba.totalReplies,
              previousReplies: previousYerba.totalReplies,
              currentRating: parseFloat((currentYerba.avgRating || 0).toFixed(1)),
              previousRating: parseFloat((previousYerba.avgRating || 0).toFixed(1))
            });
          } else {
            console.warn(`⚠️ Entrada inválida filtrada: ${currentYerba.marca} ${currentYerba.nombre}`, {
              marca: currentYerba.marca,
              nombre: currentYerba.nombre,
              changeType,
              deltaPct,
              currentScore
            });
          }
        }
      });

      // También revisar yerbas que tenían actividad anterior pero no actual
      Object.keys(previousActivityMap).forEach(yerbaId => {
        if (!currentActivity.find(y => y._id.toString() === yerbaId)) {
          const previousYerba = previousActivityMap[yerbaId];
          const previousScore = previousYerba.popularityScore || 0;
          
          // Solo incluir si tenía actividad significativa anterior y los datos están completos
          if (previousScore > 0 && previousYerba.marca && previousYerba.nombre) {
            console.log(`\n🔍 ${previousYerba.marca} ${previousYerba.nombre} (solo actividad anterior):`);
            console.log(`  📊 Score anterior: ${previousScore}, Score actual: 0`);
            
            topMovers.push({
              label: `${previousYerba.marca} ${previousYerba.nombre}`,
              yerbaName: previousYerba.nombre,
              yerbaType: previousYerba.marca,
              deltaPct: -100,
              currentScore: 0,
              previousScore: parseFloat(previousScore.toFixed(1)),
              currentInteractions: 0,
              previousInteractions: previousYerba.reviewsCount + previousYerba.totalLikes + previousYerba.totalReplies,
              changeType: 'inactive',
              yerbaId: yerbaId,
              currentReviews: 0,
              previousReviews: previousYerba.reviewsCount,
              currentLikes: 0,
              previousLikes: previousYerba.totalLikes,
              currentReplies: 0,
              previousReplies: previousYerba.totalReplies,
              currentRating: 0,
              previousRating: parseFloat((previousYerba.avgRating || 0).toFixed(1))
            });
          }
        }
      });

      console.log(`\n📊 Resumen de actividad (basado en reviews):`);
      console.log(`  - Score total actual: ${totalCurrentScore.toFixed(1)}`);
      console.log(`  - Score total anterior: ${totalPreviousScore.toFixed(1)}`);

      // Filtrar y ordenar resultados con validación más estricta
      const result = topMovers
        .filter(item => {
          // Validar que el item tenga todos los campos necesarios
          const hasValidData = item.label && 
                               item.changeType && 
                               typeof item.deltaPct === 'number' && 
                               !isNaN(item.deltaPct) &&
                               typeof item.currentScore === 'number' && 
                               !isNaN(item.currentScore) &&
                               Math.abs(item.deltaPct) > 0; // Solo cambios reales
          
          if (!hasValidData) {
            console.warn(`⚠️ Item filtrado por datos inválidos:`, item);
          }
          
          return hasValidData;
        })
        .sort((a, b) => {
          // Para períodos cortos, priorizar yerbas con actividad actual
          // Para períodos largos, priorizar por magnitud del cambio
          const periodDurationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
          const isShortPeriod = periodDurationHours <= 24; // Menos de 24 horas (período "dia")
          
          if (isShortPeriod) {
            // Para períodos cortos, priorizar:
            // 1. Yerbas con actividad actual (currentScore > 0)
            // 2. Cambios positivos sobre negativos
            // 3. Magnitud del cambio
            const aHasCurrentActivity = a.currentScore > 0 ? 1000 : 0;
            const bHasCurrentActivity = b.currentScore > 0 ? 1000 : 0;
            const aPositiveChange = a.deltaPct > 0 ? 100 : 0;
            const bPositiveChange = b.deltaPct > 0 ? 100 : 0;
            const aMagnitude = Math.abs(a.deltaPct) + (a.currentScore * 0.1);
            const bMagnitude = Math.abs(b.deltaPct) + (b.currentScore * 0.1);
            
            const aScore = aHasCurrentActivity + aPositiveChange + aMagnitude;
            const bScore = bHasCurrentActivity + bPositiveChange + bMagnitude;
            
            return bScore - aScore;
          } else {
            // Para períodos largos, usar la lógica original
            const aMagnitude = Math.abs(a.deltaPct) + (a.currentScore * 0.1);
            const bMagnitude = Math.abs(b.deltaPct) + (b.currentScore * 0.1);
            return bMagnitude - aMagnitude;
          }
        })
        .slice(0, 5);
      
      console.log(`\n✅ Top 5 movers calculados (basado en reviews): ${result.length} yerbas`);
      if (result.length === 0) {
        console.log('⚠️ No se encontraron movimientos válidos para este período');
      } else {
        result.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.label}: ${item.deltaPct > 0 ? '+' : ''}${item.deltaPct}% (${item.changeType})`);
          console.log(`     Score: ${item.previousScore} → ${item.currentScore}`);
          console.log(`     Reviews: ${item.previousReviews} → ${item.currentReviews}, Likes: ${item.previousLikes} → ${item.currentLikes}`);
        });
      }
      
      return result;

    } catch (error) {
      console.error('❌ Error getting top movers:', error);
      return [];
    }
  }

  /**
  
   * Calcula la popularidad de una yerba en un período específico
   */
  async getYerbaPopularity(yerbaId, userQuery, startDate, endDate) {
    try {
      const users = await User.find(userQuery);
      let totalScore = 0;
      let totalInteractions = 0;

      for (const user of users) {
        if (!user.shelf) continue;
        
        const items = user.shelf.filter(item => {
          if (!item.yerba || item.yerba.toString() !== yerbaId.toString()) return false;
          
          // Solo considerar items con status 'probada' o 'en estantería'
          if (!['probada', 'en estantería'].includes(item.status)) return false;
          
          // Verificar fecha si se proporciona
          if (startDate || endDate) {
            if (!item.addedAt) return false;
            const fechaItem = new Date(item.addedAt);
            if (startDate && fechaItem < startDate) return false;
            if (endDate && fechaItem > endDate) return false;
          }
          
          return true;
        });

        items.forEach(item => {
          totalInteractions++;
          // Asignar puntuación basada en el status y score
          if (item.status === 'probada' && item.score) {
            totalScore += item.score;
          } else if (item.status === 'probada') {
            totalScore += 3; // Puntuación por defecto si no hay score
          } else if (item.status === 'en estantería') {
            totalScore += 1; // Puntuación mínima por estar en estantería
          }
        });
      }

      const averageScore = totalInteractions > 0 ? totalScore / totalInteractions : 0;
      
      return {
        score: parseFloat(averageScore.toFixed(2)),
        interactions: totalInteractions
      };
      
    } catch (error) {
      console.error('❌ Error calculando popularidad de yerba:', error);
      return { score: 0, interactions: 0 };
    }
  }

  /**
   * Obtiene información de la muestra
   */
  async getSampleInfo(userQuery, startDate, endDate) {
    try {
      console.log('🔍 getSampleInfo llamada con:', { startDate, endDate });
      
      // Calcular usuarios activos en el período específico (con actividad real)
      console.log('🔍 Calculando usuarios activos...');
      const activeUsers = await this.getActiveUsersInPeriod(userQuery, startDate, endDate);
      console.log('🔍 activeUsers calculado:', activeUsers);

      // Para nUsers, usar también usuarios activos en el período
      // Ya no tiene sentido contar todos los usuarios de la base, sino los que tuvieron actividad
      const nUsers = activeUsers;

      const events = await this.getEventsInPeriod(userQuery, 
        new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), 
        new Date(endDate || new Date())
      );

      const result = {
        nUsers: nUsers, // Usuarios con actividad en el período
        nEvents: events,
        activeUsers: activeUsers // Mantenemos por compatibilidad
      };
      
      console.log('🔍 getSampleInfo resultado:', result);
      return result;

    } catch (error) {
      console.error('Error getting sample info:', error);
      return { nUsers: 0, nEvents: 0, activeUsers: 0 };
    }
  }

  /**
   * Obtiene el número de usuarios que tuvieron actividad en el período específico
   */
  async getActiveUsersInPeriod(userQuery, startDate, endDate) {
    try {
      if (!startDate || !endDate) return 0;

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Conjunto para usuarios únicos con cualquier tipo de actividad
      const activeUsersSet = new Set();

      // 1. Usuarios con reviews en yerbas
      const usersWithReviews = await Yerba.aggregate([
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'reviews.createdAt': { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$reviews.user'
          }
        }
      ]);

      usersWithReviews.forEach(user => activeUsersSet.add(user._id.toString()));

      // 2. Usuarios con respuestas a reviews
      const usersWithReplies = await Yerba.aggregate([
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
        { $unwind: { path: '$reviews.replies', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'reviews.replies.createdAt': { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: '$reviews.replies.user'
          }
        }
      ]);

      usersWithReplies.forEach(user => activeUsersSet.add(user._id.toString()));

      // 3. Usuarios con actividad en shelf (items marcados como probados)
      const usersWithShelfActivity = await User.aggregate([
        // Filtrar usuarios según criterios
        ...(Object.keys(userQuery).length > 0 ? [{ $match: userQuery }] : []),
        { $unwind: { path: '$shelf', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'shelf.addedAt': { $gte: start, $lte: end },
            'shelf.status': 'probada'
          }
        },
        {
          $group: {
            _id: '$_id'
          }
        }
      ]);

      usersWithShelfActivity.forEach(user => activeUsersSet.add(user._id.toString()));

      const activeUsersCount = activeUsersSet.size;

      console.log(`📊 Usuarios activos en período ${start.toISOString()} - ${end.toISOString()}:`);
      console.log(`  - Con reviews: ${usersWithReviews.length}`);
      console.log(`  - Con respuestas: ${usersWithReplies.length}`);
      console.log(`  - Con shelf activity: ${usersWithShelfActivity.length}`);
      console.log(`  - Total únicos: ${activeUsersCount}`);

      return activeUsersCount;

    } catch (error) {
      console.error('Error getting active users in period:', error);
      return 0;
    }
  }

  /**
   * Obtiene opciones disponibles para filtros
   */
  async getFilterOptions(filterType) {
    try {
      switch (filterType) {
        case 'countries':
          return await User.distinct('nacionalidad').then(countries => 
            countries.filter(Boolean).map(country => ({ value: country, label: country }))
          );
          
        case 'tipos-yerba':
          return await Yerba.distinct('tipo').then(tipos => 
            tipos.filter(Boolean).map(tipo => ({ value: tipo, label: tipo }))
          );
          
        case 'marcas':
          return await Yerba.distinct('marca').then(marcas => 
            marcas.filter(Boolean).map(marca => ({ value: marca, label: marca }))
          );
          
        case 'origenes':
          return await Yerba.distinct('origen').then(origenes => 
            origenes.filter(Boolean).map(origen => ({ value: origen, label: origen }))
          );
          
        case 'paises-prod':
          return await Yerba.distinct('paisProd').then(paises => 
            paises.filter(Boolean).map(pais => ({ value: pais, label: pais }))
          );
          
        case 'tipos-secado':
          return await Yerba.distinct('secado').then(secados => 
            secados.filter(Boolean).map(secado => ({ value: secado, label: secado }))
          );
          
        default:
          return [];
      }
    } catch (error) {
      console.error(`Error getting filter options for ${filterType}:`, error);
      return [];
    }
  }

  /**
   * Obtiene las notas sensoriales más populares del período
   */
  async getNotesTopData(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        timePeriod = 'mes',
        country,
        ageBucket,
        gender,
        tipoYerba,
        marca,
        origen,
        paisProd,
        secado
      } = filters;

      console.log('🎯 getNotesTopData llamado con filtros:', filters);

      // Calcular fechas del período
      let calculatedStart, calculatedEnd;
      const now = new Date();

      if (startDate && endDate) {
        if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          calculatedStart = new Date(`${startDate}T00:00:00.000Z`);
        } else if (startDate instanceof Date) {
          calculatedStart = startDate;
        } else {
          calculatedStart = new Date(startDate);
        }

        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          calculatedEnd = new Date(`${endDate}T23:59:59.999Z`);
        } else if (endDate instanceof Date) {
          calculatedEnd = new Date(endDate.getTime() + 24*60*60*1000 - 1);
        } else {
          calculatedEnd = new Date(new Date(endDate).getTime() + 24*60*60*1000 - 1);
        }
      } else {
        calculatedEnd = now;
        
        // Calcular días hacia atrás según el período
        let daysToSubtract;
        switch (timePeriod) {
          case 'semana':
            daysToSubtract = 7;
            break;
          case 'mes':
            daysToSubtract = 30;
            break;
          case 'trimestre':
            daysToSubtract = 90;
            break;
          case 'año':
            daysToSubtract = 365;
            break;
          default:
            daysToSubtract = 30; // Default a mes
        }
        
        calculatedStart = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
      }

      console.log('📅 Período calculado para notas:', {
        start: calculatedStart,
        end: calculatedEnd
      });

      // Importar dependencias necesarias
      const User = (await import('../config/userModel.js')).default;
      const { NOTE_TRANSLATIONS } = await import('../config/flavorNotes.js');

      // Construir filtros de usuario
      const userMatchFilters = {};
      if (country) userMatchFilters.nacionalidad = country;
      if (gender) userMatchFilters.genero = gender;
      if (ageBucket) {
        const ageRange = this.getAgeRangeFromBucket(ageBucket);
        if (ageRange) {
          userMatchFilters.fechaNacimiento = {
            $gte: ageRange.min.toString(),
            $lte: ageRange.max.toString()
          };
        }
      }

      // Construir filtros de yerba
      const yerbaMatchFilters = {};
      if (tipoYerba) yerbaMatchFilters['yerbaData.tipo'] = tipoYerba;
      if (marca) yerbaMatchFilters['yerbaData.marca'] = marca;
      if (origen) yerbaMatchFilters['yerbaData.origen'] = origen;
      if (paisProd) yerbaMatchFilters['yerbaData.pais'] = paisProd;
      if (secado) yerbaMatchFilters['yerbaData.secado'] = secado;

      // Pipeline de agregación para contar notas sensoriales
      const pipeline = [
        // Filtrar usuarios según criterios demográficos
        ...(Object.keys(userMatchFilters).length > 0 ? [{ $match: userMatchFilters }] : []),
        
        // Desenrollar los items del shelf
        { $unwind: '$shelf' },
        
        // Filtrar solo items probados con notas en el período
        {
          $match: {
            'shelf.status': 'probada',
            'shelf.notes': { $exists: true, $ne: [] },
            'shelf.addedAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            }
          }
        },

        // Hacer lookup de datos de yerba si hay filtros de yerba
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [
          {
            $lookup: {
              from: 'yerbas',
              localField: 'shelf.yerba',
              foreignField: '_id',
              as: 'yerbaData'
            }
          },
          { $unwind: '$yerbaData' },
          { $match: yerbaMatchFilters }
        ] : []),

        // Desenrollar las notas individuales
        { $unwind: '$shelf.notes' },
        
        // Agrupar por nota y contar
        {
          $group: {
            _id: '$shelf.notes',
            count: { $sum: 1 },
            users: { $addToSet: '$_id' } // Para calcular la privacidad
          }
        },

        // Calcular total de menciones para porcentajes
        {
          $group: {
            _id: null,
            notes: {
              $push: {
                note: '$_id',
                count: '$count',
                userCount: { $size: '$users' }
              }
            },
            totalMentions: { $sum: '$count' }
          }
        },

        // Desenrollar notas para procesamiento individual
        { $unwind: '$notes' },

        // Agregar porcentajes y filtrar por k-anonimato (mín 3 usuarios)
        {
          $addFields: {
            'notes.share': {
              $divide: ['$notes.count', '$totalMentions']
            }
          }
        },

        // Filtrar por k-anonimato relajado (mínimo 1 usuario para desarrollo)
        {
          $match: {
            'notes.userCount': { $gte: 1 }
          }
        },

        // Ordenar por frecuencia descendente
        { $sort: { 'notes.count': -1 } },

        // Limitar a top 5
        { $limit: 5 },

        // Reestructurar el resultado
        {
          $project: {
            _id: 0,
            note: '$notes.note',
            count: '$notes.count',
            share: { $round: ['$notes.share', 3] },
            userCount: '$notes.userCount'
          }
        }
      ];

      const results = await User.aggregate(pipeline);
      
      // Calcular el tamaño de muestra total
      const sampleSizePipeline = [
        ...(Object.keys(userMatchFilters).length > 0 ? [{ $match: userMatchFilters }] : []),
        { $unwind: '$shelf' },
        {
          $match: {
            'shelf.status': 'probada',
            'shelf.notes': { $exists: true, $ne: [] },
            'shelf.addedAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            }
          }
        },
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [
          {
            $lookup: {
              from: 'yerbas',
              localField: 'shelf.yerba',
              foreignField: '_id',
              as: 'yerbaData'
            }
          },
          { $unwind: '$yerbaData' },
          { $match: yerbaMatchFilters }
        ] : []),
        {
          $group: {
            _id: null,
            uniqueUsers: { $addToSet: '$_id' },
            totalItems: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            uniqueUsers: { $size: '$uniqueUsers' },
            totalItems: 1
          }
        }
      ];

      const sampleData = await User.aggregate(sampleSizePipeline);
      const sampleSize = sampleData.length > 0 ? sampleData[0].uniqueUsers : 0;
      const totalEvents = sampleData.length > 0 ? sampleData[0].totalItems : 0;

      // Traducir las notas y formatear resultado final
      const formattedNotes = results.map(item => ({
        label: NOTE_TRANSLATIONS[item.note] || item.note,
        share: item.share
      }));

      const result = {
        notes: formattedNotes,
        sample: {
          nEvents: totalEvents,
          nRatings: totalEvents,
          kAnonymityOk: true // Siempre permitir mostrar datos para desarrollo
        },
        _meta: {
          cached: false,
          source: 'real_data',
          generatedAt: new Date(),
          period: { start: calculatedStart, end: calculatedEnd },
          filters: filters
        }
      };

      console.log('✅ Notas sensoriales reales obtenidas:', {
        notesCount: result.notes.length,
        sampleSize: result.sample.nEvents,
        kAnonymityOk: result.sample.kAnonymityOk,
        source: 'real_data'
      });

      // Si no hay datos reales, devolver fallback con estructura correcta
      if (formattedNotes.length === 0) {
        console.log('⚠️ No hay datos reales, usando fallback...');
        
        const { getAllValidNotes } = await import('../config/flavorNotes.js');
        const validNotes = getAllValidNotes();
        
        const mockNotesData = [
          { label: 'amargo_alto', share: 0.31 },
          { label: 'herbal_intenso', share: 0.28 },
          { label: 'cuerpo_robusto', share: 0.24 },
          { label: 'aroma_intenso', share: 0.22 },
          { label: 'terroso', share: 0.19 }
        ];

        const fallbackNotes = mockNotesData.map(note => ({
          label: NOTE_TRANSLATIONS[note.label] || note.label,
          share: note.share
        }));

        return {
          notes: fallbackNotes,
          sample: {
            nEvents: 150,
            nRatings: 150,
            kAnonymityOk: true
          },
          _meta: {
            cached: false,
            source: 'fallback_mock',
            generatedAt: new Date()
          }
        };
      }

      return result;

    } catch (error) {
      console.error('❌ Error obteniendo notas sensoriales:', error);
      throw new Error(`Error generando datos de notas top: ${error.message}`);
    }
  }

  /**
   * Obtiene las notas sensoriales top del período basado en interacciones
   * En lugar de solo frecuencia, considera likes y respuestas de los reviews
   */
  async getNotesTopByInteractions(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        timePeriod = 'mes',
        country,
        ageBucket,
        gender,
        tipoYerba,
        marca,
        origen,
        paisProd,
        secado
      } = filters;

      console.log('🎯 getNotesTopByInteractions llamado con filtros:', filters);

      // Calcular fechas del período
      let calculatedStart, calculatedEnd;
      const now = new Date();

      if (startDate && endDate) {
        if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
          calculatedStart = new Date(`${startDate}T00:00:00.000Z`);
        } else if (startDate instanceof Date) {
          calculatedStart = startDate;
        } else {
          calculatedStart = new Date(startDate);
        }

        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          calculatedEnd = new Date(`${endDate}T23:59:59.999Z`);
        } else if (endDate instanceof Date) {
          calculatedEnd = new Date(endDate.getTime() + 24*60*60*1000 - 1);
        } else {
          calculatedEnd = new Date(new Date(endDate).getTime() + 24*60*60*1000 - 1);
        }
      } else {
        calculatedEnd = now;
        
        // Calcular días hacia atrás según el período
        let daysToSubtract;
        switch (timePeriod) {
          case 'semana':
            daysToSubtract = 7;
            break;
          case 'mes':
            daysToSubtract = 30;
            break;
          case 'trimestre':
            daysToSubtract = 90;
            break;
          case 'año':
            daysToSubtract = 365;
            break;
          default:
            daysToSubtract = 30; // Default a mes
        }
        
        calculatedStart = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
      }

      console.log('📅 Período calculado para comentarios por interacciones:', {
        start: calculatedStart,
        end: calculatedEnd
      });

      // Importar dependencias necesarias
      const { Yerba } = await import('../config/yerbasModel.js');
      const User = (await import('../config/userModel.js')).default;

      // Construir filtros de usuario
      const userMatchFilters = {};
      if (country) userMatchFilters.nacionalidad = country;
      if (gender) userMatchFilters.genero = gender;
      if (ageBucket) {
        const ageRange = this.getAgeRangeFromBucket(ageBucket);
        if (ageRange) {
          userMatchFilters.fechaNacimiento = {
            $gte: ageRange.min.toString(),
            $lte: ageRange.max.toString()
          };
        }
      }

      // Construir filtros de yerba
      const yerbaMatchFilters = {};
      if (tipoYerba) yerbaMatchFilters.tipo = tipoYerba;
      if (marca) yerbaMatchFilters.marca = marca;
      if (origen) yerbaMatchFilters.origen = origen;
      if (paisProd) yerbaMatchFilters.pais = paisProd;
      if (secado) yerbaMatchFilters.secado = secado;

      // Pipeline para obtener reviews con más interacciones en el período
      const pipeline = [
        // Filtrar yerbas según criterios
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [{ $match: yerbaMatchFilters }] : []),
        
        // Desenrollar reviews
        { $unwind: '$reviews' },
        
        // Filtrar reviews en el período que tengan comentario
        {
          $match: {
            'reviews.createdAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            },
            'reviews.comment': { $exists: true, $ne: '', $ne: null }
          }
        },

        // Hacer lookup del usuario si hay filtros demográficos
        ...(Object.keys(userMatchFilters).length > 0 ? [
          {
            $lookup: {
              from: 'users',
              localField: 'reviews.user',
              foreignField: '_id',
              as: 'reviewUser'
            }
          },
          { $unwind: '$reviewUser' },
          { $match: userMatchFilters }
        ] : []),

        // Calcular score de interacción para cada review
        {
          $addFields: {
            interactionScore: {
              $add: [
                1, // Base de 1 punto por comentario
                { 
                  $multiply: [
                    { 
                      $cond: {
                        if: { $and: [
                          { $ifNull: ['$reviews.likes', false] },
                          { $isArray: '$reviews.likes' }
                        ]},
                        then: { $size: '$reviews.likes' },
                        else: 0
                      }
                    }, 
                    2
                  ] 
                }, // Likes valen 2 puntos cada uno
                { 
                  $multiply: [
                    { 
                      $cond: {
                        if: { $and: [
                          { $ifNull: ['$reviews.replies', false] },
                          { $isArray: '$reviews.replies' }
                        ]},
                        then: { $size: '$reviews.replies' },
                        else: 0
                      }
                    }, 
                    3
                  ] 
                } // Respuestas valen 3 puntos cada una
              ]
            }
          }
        },

        // Hacer lookup para obtener datos del usuario del review
        {
          $lookup: {
            from: 'users',
            localField: 'reviews.user',
            foreignField: '_id',
            as: 'reviewAuthor'
          }
        },
        // No usar $unwind estricto para evitar perder comentarios de usuarios borrados
        {
          $addFields: {
            reviewAuthor: {
              $cond: {
                if: { $gt: [{ $size: '$reviewAuthor' }, 0] },
                then: { $arrayElemAt: ['$reviewAuthor', 0] },
                else: {
                  _id: '$reviews.user',
                  nombre: 'Usuario eliminado',
                  username: 'deleted_user'
                }
              }
            }
          }
        },

        // Proyectar datos del comentario
        {
          $project: {
            _id: 0,
            reviewId: '$reviews._id',
            comment: '$reviews.comment',
            score: '$reviews.score',
            likesCount: { 
              $cond: {
                if: { $and: [
                  { $ifNull: ['$reviews.likes', false] },
                  { $isArray: '$reviews.likes' }
                ]},
                then: { $size: '$reviews.likes' },
                else: 0
              }
            },
            repliesCount: { 
              $cond: {
                if: { $and: [
                  { $ifNull: ['$reviews.replies', false] },
                  { $isArray: '$reviews.replies' }
                ]},
                then: { $size: '$reviews.replies' },
                else: 0
              }
            },
            interactionScore: 1,
            createdAt: '$reviews.createdAt',
            authorName: '$reviewAuthor.nombre',
            authorUsername: '$reviewAuthor.username',
            yerbaName: '$nombre',
            yerbaMarca: '$marca'
          }
        },

        // Ordenar por score de interacción descendente
        { $sort: { interactionScore: -1 } },

        // Limitar a top 5
        { $limit: 5 }
      ];

      const results = await Yerba.aggregate(pipeline);
      
      // Calcular total de reviews con comentarios para el contexto
      const totalReviewsPipeline = [
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [{ $match: yerbaMatchFilters }] : []),
        { $unwind: '$reviews' },
        {
          $match: {
            'reviews.createdAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            },
            'reviews.comment': { $exists: true, $ne: '', $ne: null }
          }
        },
        ...(Object.keys(userMatchFilters).length > 0 ? [
          {
            $lookup: {
              from: 'users',
              localField: 'reviews.user',
              foreignField: '_id',
              as: 'reviewUser'
            }
          },
          { $unwind: '$reviewUser' },
          { $match: userMatchFilters }
        ] : []),
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            uniqueUsers: { $addToSet: '$reviews.user' }
          }
        }
      ];

      const totalData = await Yerba.aggregate(totalReviewsPipeline);
      const totalReviews = totalData.length > 0 ? totalData[0].totalReviews : 0;
      const uniqueUsers = totalData.length > 0 ? totalData[0].uniqueUsers.length : 0;

      // Formatear comentarios para el frontend
      const formattedComments = results.map((item, index) => {
        // Truncar comentario para mostrar
        const truncatedComment = item.comment.length > 100 
          ? item.comment.substring(0, 100) + '...'
          : item.comment;
        
        return {
          label: truncatedComment,
          fullComment: item.comment,
          author: item.authorName || 'Usuario eliminado', // Frontend espera 'author'
          authorName: item.authorName || 'Usuario eliminado',
          authorUsername: item.authorUsername || 'deleted_user',
          yerba: `${item.yerbaName} (${item.yerbaMarca})`, // Frontend espera 'yerba'
          yerbaName: item.yerbaName,
          yerbaMarca: item.yerbaMarca,
          score: item.score,
          interactionScore: item.interactionScore,
          normalizedScore: item.interactionScore, // Para compatibilidad con frontend
          likes: item.likesCount, // Frontend espera 'likes'
          likesCount: item.likesCount,
          replies: item.repliesCount, // Frontend espera 'replies'
          repliesCount: item.repliesCount,
          createdAt: item.createdAt,
          reviewCount: 1, // Cada item es un review
          userCount: 1, // Cada item es de un usuario
          avgLikes: item.likesCount,
          avgReplies: item.repliesCount
        };
      });

      const result = {
        notes: formattedComments, // Mantenemos 'notes' para compatibilidad con frontend
        sample: {
          nEvents: totalReviews,
          nRatings: totalReviews,
          kAnonymityOk: uniqueUsers >= 2
        },
        _meta: {
          cached: false,
          source: 'interaction_based_comments',
          generatedAt: new Date(),
          period: { start: calculatedStart, end: calculatedEnd },
          filters: filters,
          algorithm: 'comment_interaction_weighted'
        }
      };

      console.log('✅ Comentarios top por interacciones obtenidos:', {
        commentsCount: result.notes.length,
        totalReviews: result.sample.nEvents,
        uniqueUsers: uniqueUsers,
        source: 'interaction_based_comments'
      });

      return result;

    } catch (error) {
      console.error('❌ Error obteniendo comentarios top por interacciones:', error);
      throw new Error(`Error generando datos de comentarios top por interacciones: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las entidades disponibles por tipo
   */
  async getAvailableEntities(entityType) {
    try {
      console.log(`🔍 Obteniendo entidades disponibles para: ${entityType}`);
      
      let field;
      switch (entityType) {
        case 'tipo':
          field = 'tipo';
          break;
        case 'marca':
          field = 'marca';
          break;
        case 'origen':
          field = 'origen';
          break;
        case 'pais':
        case 'paisProd':
          field = 'pais';
          break;
        case 'secado':
          field = 'secado';
          break;
        case 'establecimiento':
          field = 'establecimiento';
          break;
        case 'containsPalo':
        case 'palo':
          field = 'containsPalo';
          break;
        case 'leafCut':
        case 'corte':
          field = 'leafCut';
          break;
        case 'tipoEstacionamiento':
          field = 'tipoEstacionamiento';
          break;
        case 'tiempoEstacionamiento':
          field = 'tiempoEstacionamiento';
          break;
        case 'produccion':
          field = 'produccion';
          break;
        default:
          console.warn(`⚠️ EntityType no reconocido: ${entityType}`);
          return [];
      }

      // Obtener valores únicos del campo especificado
      const entities = await Yerba.distinct(field);
      
      // Filtrar valores null, undefined o vacíos
      const validEntities = entities.filter(entity => 
        entity != null && 
        entity !== '' && 
        typeof entity === 'string' && 
        entity.trim().length > 0
      );

      console.log(`📋 Entidades encontradas para ${entityType}:`, validEntities);
      
      return validEntities.sort(); // Ordenar alfabéticamente
    } catch (error) {
      console.error(`❌ Error obteniendo entidades para ${entityType}:`, error);
      return [];
    }
  }

  /**
   * Obtiene el rango de días para un período de tiempo
   */
  getDaysFromTimePeriod(timePeriod) {
    switch (timePeriod) {
      case 'semana':
        return 7;
      case 'mes':
        return 30;
      case 'trimestre':
        return 90;
      case 'año':
        return 365;
      default:
        return 30; // Default a mes
    }
  }

  /**
   * Obtiene el rango de edad desde un bucket de edad
   */
  getAgeRangeFromBucket(ageBucket) {
    const currentYear = new Date().getFullYear();
    
    switch (ageBucket) {
      case '18-25':
        return { min: currentYear - 25, max: currentYear - 18 };
      case '26-35':
        return { min: currentYear - 35, max: currentYear - 26 };
      case '36-45':
        return { min: currentYear - 45, max: currentYear - 36 };
      case '46-55':
        return { min: currentYear - 55, max: currentYear - 46 };
      case '56+':
        return { min: currentYear - 100, max: currentYear - 56 };
      default:
        return null;
    }
  }

  /**
   * Cuenta eventos de descubrimiento específicos (nuevas yerbas probadas por primera vez)
   * Ahora acepta filtros de yerba para limitar a entidades específicas
   */
  async getDiscoveryEvents(userQuery, startDate, endDate, yerbaQuery = {}) {
    try {
      console.log('🔍 getDiscoveryEvents - Contando eventos de descubrimiento:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userQuery,
        yerbaQuery
      });

      // Obtener usuarios con catas en el período
      const usersWithTasting = await this.getUsersWithTasting(userQuery, startDate, endDate);
      
      if (usersWithTasting.length === 0) {
        console.log('❌ No hay usuarios con catas en el período');
        return 0;
      }

      // Si se proporciona un filtro de yerba, obtener los IDs de yerbas permitidas
      let allowedYerbaIds = null;
      if (yerbaQuery && Object.keys(yerbaQuery).length > 0) {
        try {
          allowedYerbaIds = await Yerba.find(yerbaQuery).distinct('_id');
          allowedYerbaIds = allowedYerbaIds.map(id => id.toString());
          console.log(`🎯 Filtro de yerbas aplicado: ${allowedYerbaIds.length} yerbas permitidas`);
        } catch (err) {
          console.warn('⚠️ Error obteniendo yerbas permitidas por filtro, ignorando filtro:', err.message);
          allowedYerbaIds = null;
        }
      }

      let totalDiscoveryEvents = 0;

      for (const userId of usersWithTasting) {
        const user = await User.findById(userId);
        if (!user || !user.shelf) continue;

        // Obtener items probados en el período
        let itemsEnPeriodo = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' &&
                 (!startDate || fechaItem >= startDate) &&
                 (!endDate || fechaItem <= endDate);
        });

        // Si hay filtro de yerbas, limitar a los IDs permitidos
        if (allowedYerbaIds && allowedYerbaIds.length > 0) {
          itemsEnPeriodo = itemsEnPeriodo.filter(item => 
            allowedYerbaIds.includes((item.yerba || '').toString())
          );
        }

        // Obtener yerbas probadas antes del período (limitadas por filtro si existe)
        let itemsAnteriores = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' && startDate && fechaItem < startDate;
        });

        if (allowedYerbaIds && allowedYerbaIds.length > 0) {
          itemsAnteriores = itemsAnteriores.filter(item => 
            allowedYerbaIds.includes((item.yerba || '').toString())
          );
        }

        const yerbasAnteriores = new Set(itemsAnteriores.map(item => item.yerba?.toString()));

        // Contar cada yerba nueva probada por primera vez como un evento de descubrimiento
        for (const item of itemsEnPeriodo) {
          const yerbaId = item.yerba?.toString();
          if (yerbaId && !yerbasAnteriores.has(yerbaId)) {
            totalDiscoveryEvents++;
            console.log(`🎯 Evento de descubrimiento: Usuario ${userId} descubrió yerba ${yerbaId}`);
          }
        }
      }

      console.log(`📊 Total eventos de descubrimiento: ${totalDiscoveryEvents}`);
      return totalDiscoveryEvents;

    } catch (error) {
      console.error('❌ Error calculating discovery events:', error);
      return 0;
    }
  }
}

// Exportar tanto la clase como una instancia por defecto
export { MetricsService };
export default new MetricsService();
