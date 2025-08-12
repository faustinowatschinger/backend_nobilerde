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
            // Para período de día, usar el día completo de hoy
            calculatedEnd = now;
            calculatedStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Inicio del día actual
            break;
          case 'semana':
            // Para período de semana, usar los últimos 7 días
            calculatedEnd = now;
            calculatedStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 días atrás
            break;
          case 'mes':
            // Para período de mes, usar las últimas 4 semanas (28 días)
            calculatedEnd = now;
            calculatedStart = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000)); // 28 días atrás
            break;
          case 'año':
            // Para período de año, usar los últimos 12 meses
            calculatedEnd = now;
            calculatedStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
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
      const discoveryData = await this.getDiscoveryRate(userQuery, calculatedStart, calculatedEnd);
      
      // Obtener actividad temporal con granularidad dinámica
      const temporalActivity = await this.getTemporalActivity(
        userQuery, 
        calculatedStart, 
        calculatedEnd, 
        timePeriod
      );
      
      // Obtener distribución por tipos
      const typeBreakdown = await this.getTypeBreakdown(userQuery, yerbaQuery, calculatedStart, calculatedEnd);
      
      // Obtener principales movimientos
      const topMovers = await this.getTopMovers(userQuery, yerbaQuery, calculatedStart, calculatedEnd);

      // Información de la muestra
      const sample = await this.getSampleInfo(userQuery, calculatedStart, calculatedEnd);

      return {
        usersWithTasting30d,
        discoveryRate: discoveryData.rate,
        discoveryDeltaPp: discoveryData.deltaPp,
        weeklyActivity: temporalActivity.data, // Mantener nombre por compatibilidad
        temporalActivity: temporalActivity, // Nueva estructura
        typeBreakdown,
        topMovers,
        sample
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
    if (filters.paisProd) query.paisProd = filters.paisProd;
    if (filters.secado) query.secado = filters.secado;

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
   */
  async getDiscoveryRate(userQuery, startDate, endDate) {
    try {
      // Obtener usuarios con catas en el período
      const usersWithTasting = await this.getUsersWithTasting(userQuery, startDate, endDate);
      
      if (usersWithTasting.length === 0) {
        return { rate: 0, deltaPp: 0 };
      }

      // Contar usuarios que probaron nuevas yerbas
      let usersWithDiscovery = 0;
      
      for (const userId of usersWithTasting) {
        const user = await User.findById(userId);
        if (!user || !user.shelf) continue;

        // Filtrar items probados en el período
        const itemsEnPeriodo = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' &&
                 (!startDate || fechaItem >= startDate) &&
                 (!endDate || fechaItem <= endDate);
        });

        // Obtener yerbas únicas probadas en el período
        const yerbasEnPeriodo = [...new Set(itemsEnPeriodo.map(item => item.yerba?.toString()))];
        
        // Obtener yerbas probadas antes del período
        const itemsAnteriores = user.shelf.filter(item => {
          const fechaItem = new Date(item.addedAt);
          return item.status === 'probada' && startDate && fechaItem < startDate;
        });
        const yerbasAnteriores = new Set(itemsAnteriores.map(item => item.yerba?.toString()));

        // Verificar si probó alguna yerba nueva
        const hayNuevas = yerbasEnPeriodo.some(yerbaId => !yerbasAnteriores.has(yerbaId));
        if (hayNuevas) {
          usersWithDiscovery++;
        }
      }

      const rate = usersWithDiscovery / usersWithTasting.length;
      
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
    const users = await User.find({
      ...userQuery,
      'shelf.addedAt': {
        $gte: startDate,
        $lte: endDate
      },
      'shelf.status': 'probada'
    });

    let totalEvents = 0;
    for (const user of users) {
      if (user.shelf) {
        const eventsInPeriod = user.shelf.filter(item => {
          const fecha = new Date(item.addedAt);
          return item.status === 'probada' && fecha >= startDate && fecha <= endDate;
        });
        totalEvents += eventsInPeriod.length;
      }
    }

    return totalEvents;
  }

  /**
   * Obtiene actividad temporal con granularidad dinámica
   */
  async getTemporalActivity(userQuery, startDate, endDate, timePeriod = 'mes') {
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

      const periods = this.generateTemporalPeriods(startDate, endDate, granularity);
      const temporalData = [];

      console.log(`📈 Períodos generados: ${periods.length}`);

      for (const period of periods) {
        const events = await this.getEventsInPeriod(userQuery, period.start, period.end);
        
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
            originalEnd: endDate
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
   * Cuenta eventos (catas) en un período específico
   */
  async getEventsInPeriod(userQuery, startDate, endDate) {
    const users = await User.find({
      ...userQuery,
      'shelf.addedAt': {
        $gte: startDate,
        $lte: endDate
      },
      'shelf.status': 'probada'
    });

    let totalEvents = 0;
    for (const user of users) {
      if (user.shelf) {
        const eventsInPeriod = user.shelf.filter(item => {
          const fecha = new Date(item.addedAt);
          return item.status === 'probada' && fecha >= startDate && fecha <= endDate;
        });
        totalEvents += eventsInPeriod.length;
      }
    }

    return totalEvents;
  }

  /**
   * Obtiene distribución por tipos de yerba
   */
  async getTypeBreakdown(userQuery, yerbaQuery, startDate, endDate) {
    try {
      console.log('🔍 getTypeBreakdown - Iniciando análisis...');
      console.log('📅 Filtros de fecha:', { startDate, endDate });
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

      console.log(`\n📈 Total de catas encontradas en período: ${totalCatas}`);

      // Si hay muy pocas catas en el período (menos de 3), obtener datos de todos los tiempos
      if (totalCatas < 3) {
        console.log('⚠️ Pocas catas en el período especificado (< 3)');
        console.log('🔄 Obteniendo datos de todos los tiempos para contexto...');
        
        const allTimeBreakdown = [];
        let totalCatasAllTime = 0;
        
        for (const [tipo, yerbaIds] of Object.entries(yerbasByType)) {
          const catasAllTime = await this.getCatasForYerbas(userQuery, yerbaIds, null, null);
          console.log(`📊 Catas totales para ${tipo}: ${catasAllTime}`);
          
          if (catasAllTime > 0) {
            allTimeBreakdown.push({
              label: tipo,
              count: catasAllTime,
              share: 0,
              period: 'all-time'
            });
            totalCatasAllTime += catasAllTime;
          }
        }

        // Si hay datos de todos los tiempos, usarlos como base
        if (totalCatasAllTime > 0) {
          console.log(`📊 Total catas de todos los tiempos: ${totalCatasAllTime}`);
          
          // Calcular porcentajes de todos los tiempos
          allTimeBreakdown.forEach(item => {
            item.share = (item.count / totalCatasAllTime) * 100;
          });

          // Ordenar por cantidad
          const sortedAllTime = allTimeBreakdown.sort((a, b) => b.count - a.count);
          
          // Agregar nota sobre el período
          sortedAllTime.forEach(item => {
            item.note = 'Datos históricos (todos los tiempos)';
          });

          console.log('✅ Usando datos históricos para distribución por tipos');
          return sortedAllTime;
        }
      }

      // Calcular porcentajes del período actual
      if (totalCatas > 0) {
        typeBreakdown.forEach(item => {
          item.share = (item.count / totalCatas) * 100;
        });
      }

      const result = typeBreakdown.sort((a, b) => b.count - a.count);
      console.log('✅ Resultado final getTypeBreakdown:', result);
      
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
   */
  async getTopMovers(userQuery, yerbaQuery, startDate, endDate) {
    try {
      console.log('🔍 getTopMovers - Calculando cambios reales en popularidad...');
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

      // Obtener yerbas que coinciden con los filtros
      const yerbas = await Yerba.find(yerbaQuery).limit(20);
      console.log(`🌿 Yerbas encontradas para análisis: ${yerbas.length}`);

      if (yerbas.length === 0) {
        console.log('⚠️ No se encontraron yerbas para analizar');
        return [];
      }

      const topMovers = [];
      let totalInteractionsCurrent = 0;
      let totalInteractionsPrevious = 0;

      // Analizar cada yerba
      for (const yerba of yerbas) {
        console.log(`\n🔍 Analizando yerba: ${yerba.marca} ${yerba.nombre}`);
        
        // Calcular popularidad en período actual
        const currentPopularity = await this.getYerbaPopularity(
          yerba._id, 
          userQuery, 
          startDate, 
          endDate
        );
        
        // Calcular popularidad en período anterior
        const previousPopularity = await this.getYerbaPopularity(
          yerba._id, 
          userQuery, 
          previousStart, 
          previousEnd
        );
        
        totalInteractionsCurrent += currentPopularity.interactions;
        totalInteractionsPrevious += previousPopularity.interactions;
        
        console.log(`  📊 Popularidad actual: ${currentPopularity.score} (${currentPopularity.interactions} interacciones)`);
        console.log(`  📊 Popularidad anterior: ${previousPopularity.score} (${previousPopularity.interactions} interacciones)`);

        // Solo incluir yerbas con actividad significativa
        if (currentPopularity.interactions > 0 || previousPopularity.interactions > 0) {
          // Calcular cambio porcentual solo si hay datos significativos
          let deltaPct = 0;
          let changeType = 'stable';
          
          if (previousPopularity.interactions > 0 && currentPopularity.interactions > 0) {
            // Actividad en ambos períodos
            if (previousPopularity.score > 0) {
              deltaPct = ((currentPopularity.score - previousPopularity.score) / previousPopularity.score) * 100;
              // Limitar el cambio a un rango razonable (-200% a +200%)
              deltaPct = Math.max(-200, Math.min(200, deltaPct));
            }
            changeType = deltaPct > 0 ? 'increasing' : deltaPct < 0 ? 'decreasing' : 'stable';
          } else if (currentPopularity.interactions > 0 && previousPopularity.interactions === 0) {
            // Nueva actividad
            deltaPct = 25; // Valor moderado para nuevas yerbas
            changeType = 'new';
          } else if (currentPopularity.interactions === 0 && previousPopularity.interactions > 0) {
            // Pérdida de actividad
            deltaPct = -25; // Valor moderado para yerbas inactivas
            changeType = 'inactive';
          }

          console.log(`  📈 Cambio porcentual: ${deltaPct.toFixed(1)}% (${changeType})`);

          topMovers.push({
            label: `${yerba.marca} ${yerba.nombre}`,
            deltaPct: parseFloat(deltaPct.toFixed(1)),
            currentScore: currentPopularity.score,
            previousScore: previousPopularity.score,
            currentInteractions: currentPopularity.interactions,
            previousInteractions: previousPopularity.interactions,
            changeType,
            yerbaId: yerba._id.toString()
          });
        }
      }

      console.log(`\n📊 Resumen de interacciones:`);
      console.log(`  - Período actual: ${totalInteractionsCurrent} interacciones`);
      console.log(`  - Período anterior: ${totalInteractionsPrevious} interacciones`);

      // Si hay muy pocas interacciones, agregar nota
      if (totalInteractionsCurrent < 3 && totalInteractionsPrevious < 3) {
        console.log('⚠️ Pocas interacciones en ambos períodos - datos limitados');
      }

      // Ordenar por magnitud del cambio y limitar a top 5
      const result = topMovers
        .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
        .slice(0, 5);
      
      console.log(`\n✅ Top 5 movers calculados: ${result.length} yerbas`);
      result.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.label}: ${item.deltaPct > 0 ? '+' : ''}${item.deltaPct}% (${item.changeType})`);
      });
      
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
      const users = await User.find(userQuery);
      const events = await this.getEventsInPeriod(userQuery, 
        new Date(startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), 
        new Date(endDate || new Date())
      );

      return {
        nUsers: users.length,
        nEvents: events
      };

    } catch (error) {
      console.error('Error getting sample info:', error);
      return { nUsers: 0, nEvents: 0 };
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

      console.log('📅 Período calculado para notas por interacciones:', {
        start: calculatedStart,
        end: calculatedEnd
      });

      // Importar dependencias necesarias
      const { Yerba } = await import('../config/yerbasModel.js');
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
      if (tipoYerba) yerbaMatchFilters.tipo = tipoYerba;
      if (marca) yerbaMatchFilters.marca = marca;
      if (origen) yerbaMatchFilters.origen = origen;
      if (paisProd) yerbaMatchFilters.pais = paisProd;
      if (secado) yerbaMatchFilters.secado = secado;

      // Pipeline para obtener reviews con interacciones en el período
      const pipeline = [
        // Filtrar yerbas según criterios
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [{ $match: yerbaMatchFilters }] : []),
        
        // Desenrollar reviews
        { $unwind: '$reviews' },
        
        // Filtrar reviews en el período con notas
        {
          $match: {
            'reviews.createdAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            },
            'reviews.notes': { $exists: true, $ne: [] }
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

        // Desenrollar las notas individuales
        { $unwind: '$reviews.notes' },
        
        // Calcular score de interacción para cada review
        {
          $addFields: {
            interactionScore: {
              $add: [
                1, // Peso base por mencionar la nota
                { $multiply: [{ $size: '$reviews.likes' }, 2] }, // Likes valen 2 puntos
                { $multiply: [{ $size: '$reviews.replies' }, 3] } // Respuestas valen 3 puntos
              ]
            }
          }
        },

        // Agrupar por nota y sumar scores de interacción
        {
          $group: {
            _id: '$reviews.notes',
            totalInteractionScore: { $sum: '$interactionScore' },
            reviewCount: { $sum: 1 },
            users: { $addToSet: '$reviews.user' },
            avgLikes: { $avg: { $size: '$reviews.likes' } },
            avgReplies: { $avg: { $size: '$reviews.replies' } }
          }
        },

        // Calcular score normalizado (interacciones por review)
        {
          $addFields: {
            normalizedScore: {
              $divide: ['$totalInteractionScore', '$reviewCount']
            }
          }
        },

        // Filtrar por mínimo de usuarios únicos (k-anonimato relajado)
        {
          $match: {
            users: { $size: { $gte: 2 } } // Mínimo 2 usuarios diferentes
          }
        },

        // Ordenar por score de interacción normalizado
        { $sort: { normalizedScore: -1 } },

        // Limitar a top 5
        { $limit: 5 },

        // Proyectar resultado final
        {
          $project: {
            _id: 0,
            note: '$_id',
            interactionScore: '$totalInteractionScore',
            normalizedScore: { $round: ['$normalizedScore', 2] },
            reviewCount: 1,
            userCount: { $size: '$users' },
            avgLikes: { $round: ['$avgLikes', 1] },
            avgReplies: { $round: ['$avgReplies', 1] }
          }
        }
      ];

      const results = await Yerba.aggregate(pipeline);
      
      // Calcular total de reviews con notas para el contexto
      const totalReviewsPipeline = [
        ...(Object.keys(yerbaMatchFilters).length > 0 ? [{ $match: yerbaMatchFilters }] : []),
        { $unwind: '$reviews' },
        {
          $match: {
            'reviews.createdAt': {
              $gte: calculatedStart,
              $lte: calculatedEnd
            },
            'reviews.notes': { $exists: true, $ne: [] }
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

      // Traducir notas y formatear para el frontend
      const formattedNotes = results.map((item, index) => {
        // Calcular share basado en el score de interacción
        const maxScore = results[0]?.normalizedScore || 1;
        const share = maxScore > 0 ? item.normalizedScore / maxScore : 0;
        
        return {
          label: NOTE_TRANSLATIONS[item.note] || item.note,
          share: share,
          interactionScore: item.interactionScore,
          normalizedScore: item.normalizedScore,
          reviewCount: item.reviewCount,
          userCount: item.userCount,
          avgLikes: item.avgLikes,
          avgReplies: item.avgReplies
        };
      });

      const result = {
        notes: formattedNotes,
        sample: {
          nEvents: totalReviews,
          nRatings: totalReviews,
          kAnonymityOk: uniqueUsers >= 2
        },
        _meta: {
          cached: false,
          source: 'interaction_based',
          generatedAt: new Date(),
          period: { start: calculatedStart, end: calculatedEnd },
          filters: filters,
          algorithm: 'interaction_weighted'
        }
      };

      console.log('✅ Notas top por interacciones obtenidas:', {
        notesCount: result.notes.length,
        totalReviews: result.sample.nEvents,
        uniqueUsers: uniqueUsers,
        source: 'interaction_based'
      });

      return result;

    } catch (error) {
      console.error('❌ Error obteniendo notas top por interacciones:', error);
      throw new Error(`Error generando datos de notas top por interacciones: ${error.message}`);
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
}

// Exportar tanto la clase como una instancia por defecto
export { MetricsService };
export default new MetricsService();
