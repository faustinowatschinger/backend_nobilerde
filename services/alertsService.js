// backend/services/alertsService.js
import Event from '../config/eventModel.js';
import User from '../config/userModel.js';
import { yerbasConn } from '../config/multiDB.js';
import cron from 'node-cron';

/**
 * Servicio para detectar cambios significativos y generar alertas automáticas
 */
export class AlertsService {
  constructor() {
    this.SIGNIFICANCE_THRESHOLD = 0.15; // 15% de cambio para considerar significativo
    this.MIN_SAMPLE_SIZE = 30; // Mínimo de eventos para considerar válido
  }

  /**
   * Detecta cambios significativos en tendencias de mercado
   */
  async detectTrendChanges() {
    const alerts = [];
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const now = new Date();

    try {
      // 1. Cambios en interés por tipo de yerba
      const typeChanges = await this.detectTypeInterestChanges(fourWeeksAgo, twoWeeksAgo, now);
      alerts.push(...typeChanges);

      // 2. Cambios en ratings promedio
      const ratingChanges = await this.detectRatingChanges(fourWeeksAgo, twoWeeksAgo, now);
      alerts.push(...ratingChanges);

      // 3. Cambios en notas de sabor populares
      const flavorChanges = await this.detectFlavorTrendChanges(fourWeeksAgo, twoWeeksAgo, now);
      alerts.push(...flavorChanges);

      // 4. Cambios geográficos
      const geoChanges = await this.detectGeographicChanges(fourWeeksAgo, twoWeeksAgo, now);
      alerts.push(...geoChanges);

      // 5. Cambios en comportamiento de usuarios
      const behaviorChanges = await this.detectBehaviorChanges(fourWeeksAgo, twoWeeksAgo, now);
      alerts.push(...behaviorChanges);

      return alerts.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    } catch (error) {
      console.error('❌ Error detectando cambios de tendencias:', error);
      return [];
    }
  }

  /**
   * Detecta cambios en interés por tipos de yerba
   */
  async detectTypeInterestChanges(startDate, midDate, endDate) {
    const alerts = [];

    try {
      const [period1Data, period2Data] = await Promise.all([
        // Período 1: hace 4-2 semanas
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'add_shelf', 'rate'] },
              timestamp: { $gte: startDate, $lt: midDate }
            }
          },
          {
            $lookup: {
              from: 'yerbas',
              localField: 'yerba',
              foreignField: '_id',
              as: 'yerbaInfo'
            }
          },
          {
            $group: {
              _id: {
                tipo: { $arrayElemAt: ['$yerbaInfo.tipo', 0] },
                pais: { $arrayElemAt: ['$yerbaInfo.pais', 0] }
              },
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$user' }
            }
          }
        ]),
        // Período 2: últimas 2 semanas
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'add_shelf', 'rate'] },
              timestamp: { $gte: midDate, $lte: endDate }
            }
          },
          {
            $lookup: {
              from: 'yerbas',
              localField: 'yerba',
              foreignField: '_id',
              as: 'yerbaInfo'
            }
          },
          {
            $group: {
              _id: {
                tipo: { $arrayElemAt: ['$yerbaInfo.tipo', 0] },
                pais: { $arrayElemAt: ['$yerbaInfo.pais', 0] }
              },
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$user' }
            }
          }
        ])
      ]);

      // Comparar períodos
      const period1Map = new Map();
      period1Data.forEach(item => {
        if (item._id.tipo && item._id.pais) {
          const key = `${item._id.tipo}_${item._id.pais}`;
          period1Map.set(key, item.count);
        }
      });

      period2Data.forEach(item => {
        if (item._id.tipo && item._id.pais && item.count >= this.MIN_SAMPLE_SIZE) {
          const key = `${item._id.tipo}_${item._id.pais}`;
          const period1Count = period1Map.get(key) || 0;
          const period2Count = item.count;

          if (period1Count > 0) {
            const changePercent = (period2Count - period1Count) / period1Count;
            
            if (Math.abs(changePercent) >= this.SIGNIFICANCE_THRESHOLD) {
              alerts.push({
                type: 'trend_change',
                category: 'tipo_interes',
                title: `${changePercent > 0 ? '↗️' : '↘️'} Cambio en interés por ${item._id.tipo}`,
                description: `${changePercent > 0 ? 'Aumento' : 'Disminución'} del ${Math.abs(changePercent * 100).toFixed(1)}% en interés por ${item._id.tipo} en ${item._id.pais}`,
                changePercent: changePercent,
                data: {
                  tipo: item._id.tipo,
                  pais: item._id.pais,
                  period1Count,
                  period2Count
                },
                severity: Math.abs(changePercent) > 0.3 ? 'high' : 'medium',
                timestamp: new Date()
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error detectando cambios de tipo:', error);
    }

    return alerts;
  }

  /**
   * Detecta cambios en ratings promedio
   */
  async detectRatingChanges(startDate, midDate, endDate) {
    const alerts = [];

    try {
      const [period1Ratings, period2Ratings] = await Promise.all([
        Event.aggregate([
          {
            $match: {
              type: 'rate',
              timestamp: { $gte: startDate, $lt: midDate }
            }
          },
          {
            $lookup: {
              from: 'yerbas',
              localField: 'yerba',
              foreignField: '_id',
              as: 'yerbaInfo'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$yerbaInfo.marca', 0] },
              avgRating: { $avg: '$score' },
              count: { $sum: 1 }
            }
          },
          {
            $match: { count: { $gte: this.MIN_SAMPLE_SIZE } }
          }
        ]),
        Event.aggregate([
          {
            $match: {
              type: 'rate',
              timestamp: { $gte: midDate, $lte: endDate }
            }
          },
          {
            $lookup: {
              from: 'yerbas',
              localField: 'yerba',
              foreignField: '_id',
              as: 'yerbaInfo'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$yerbaInfo.marca', 0] },
              avgRating: { $avg: '$score' },
              count: { $sum: 1 }
            }
          },
          {
            $match: { count: { $gte: this.MIN_SAMPLE_SIZE } }
          }
        ])
      ]);

      const period1Map = new Map();
      period1Ratings.forEach(item => {
        if (item._id) {
          period1Map.set(item._id, item.avgRating);
        }
      });

      period2Ratings.forEach(item => {
        if (item._id) {
          const period1Rating = period1Map.get(item._id);
          if (period1Rating) {
            const changePercent = (item.avgRating - period1Rating) / period1Rating;
            const absoluteChange = item.avgRating - period1Rating;
            
            if (Math.abs(absoluteChange) >= 0.3) { // Cambio de 0.3 puntos o más
              alerts.push({
                type: 'rating_change',
                category: 'calidad_percibida',
                title: `${absoluteChange > 0 ? '⭐' : '📉'} Cambio en rating de ${item._id}`,
                description: `Rating promedio ${absoluteChange > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(absoluteChange).toFixed(2)} puntos (${Math.abs(changePercent * 100).toFixed(1)}%)`,
                changePercent: changePercent,
                data: {
                  marca: item._id,
                  period1Rating: period1Rating.toFixed(2),
                  period2Rating: item.avgRating.toFixed(2),
                  absoluteChange: absoluteChange.toFixed(2)
                },
                severity: Math.abs(absoluteChange) > 0.5 ? 'high' : 'medium',
                timestamp: new Date()
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error detectando cambios de rating:', error);
    }

    return alerts;
  }

  /**
   * Detecta cambios en tendencias de notas de sabor
   */
  async detectFlavorTrendChanges(startDate, midDate, endDate) {
    const alerts = [];

    try {
      const [period1Flavors, period2Flavors] = await Promise.all([
        Event.aggregate([
          {
            $match: {
              type: 'rate',
              notes: { $exists: true, $not: { $size: 0 } },
              timestamp: { $gte: startDate, $lt: midDate }
            }
          },
          { $unwind: '$notes' },
          {
            $group: {
              _id: '$notes',
              count: { $sum: 1 }
            }
          }
        ]),
        Event.aggregate([
          {
            $match: {
              type: 'rate',
              notes: { $exists: true, $not: { $size: 0 } },
              timestamp: { $gte: midDate, $lte: endDate }
            }
          },
          { $unwind: '$notes' },
          {
            $group: {
              _id: '$notes',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const period1Map = new Map();
      period1Flavors.forEach(item => {
        period1Map.set(item._id, item.count);
      });

      period2Flavors.forEach(item => {
        if (item.count >= this.MIN_SAMPLE_SIZE) {
          const period1Count = period1Map.get(item._id) || 0;
          if (period1Count > 0) {
            const changePercent = (item.count - period1Count) / period1Count;
            
            if (Math.abs(changePercent) >= this.SIGNIFICANCE_THRESHOLD) {
              alerts.push({
                type: 'flavor_trend',
                category: 'notas_sabor',
                title: `${changePercent > 0 ? '🔥' : '❄️'} Cambio en popularidad de "${item._id}"`,
                description: `La nota "${item._id}" ${changePercent > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(changePercent * 100).toFixed(1)}% en popularidad`,
                changePercent: changePercent,
                data: {
                  nota: item._id,
                  period1Count,
                  period2Count: item.count
                },
                severity: Math.abs(changePercent) > 0.4 ? 'high' : 'medium',
                timestamp: new Date()
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error detectando cambios de sabor:', error);
    }

    return alerts;
  }

  /**
   * Detecta cambios geográficos significativos
   */
  async detectGeographicChanges(startDate, midDate, endDate) {
    const alerts = [];

    try {
      const [period1Geo, period2Geo] = await Promise.all([
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'rate', 'add_shelf'] },
              timestamp: { $gte: startDate, $lt: midDate }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$userInfo.nacionalidad', 0] },
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$user' }
            }
          }
        ]),
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'rate', 'add_shelf'] },
              timestamp: { $gte: midDate, $lte: endDate }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $group: {
              _id: { $arrayElemAt: ['$userInfo.nacionalidad', 0] },
              count: { $sum: 1 },
              uniqueUsers: { $addToSet: '$user' }
            }
          }
        ])
      ]);

      const period1Map = new Map();
      period1Geo.forEach(item => {
        if (item._id) {
          period1Map.set(item._id, item.count);
        }
      });

      period2Geo.forEach(item => {
        if (item._id && item.count >= this.MIN_SAMPLE_SIZE) {
          const period1Count = period1Map.get(item._id) || 0;
          if (period1Count > 0) {
            const changePercent = (item.count - period1Count) / period1Count;
            
            if (Math.abs(changePercent) >= this.SIGNIFICANCE_THRESHOLD) {
              alerts.push({
                type: 'geographic_change',
                category: 'expansion_geografica',
                title: `🌍 Cambio en actividad en ${item._id}`,
                description: `Actividad en ${item._id} ${changePercent > 0 ? 'aumentó' : 'disminuyó'} ${Math.abs(changePercent * 100).toFixed(1)}%`,
                changePercent: changePercent,
                data: {
                  pais: item._id,
                  period1Count,
                  period2Count: item.count,
                  uniqueUsers: item.uniqueUsers.length
                },
                severity: Math.abs(changePercent) > 0.3 ? 'high' : 'medium',
                timestamp: new Date()
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error detectando cambios geográficos:', error);
    }

    return alerts;
  }

  /**
   * Detecta cambios en patrones de comportamiento
   */
  async detectBehaviorChanges(startDate, midDate, endDate) {
    const alerts = [];

    try {
      // Detectar cambios en la relación vista->compra
      const [period1Funnel, period2Funnel] = await Promise.all([
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'add_shelf'] },
              timestamp: { $gte: startDate, $lt: midDate }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ]),
        Event.aggregate([
          {
            $match: {
              type: { $in: ['view_yerba', 'add_shelf'] },
              timestamp: { $gte: midDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      // Calcular conversion rates
      const getConversionRate = (data) => {
        const views = data.find(d => d._id === 'view_yerba')?.count || 0;
        const adds = data.find(d => d._id === 'add_shelf')?.count || 0;
        return views > 0 ? adds / views : 0;
      };

      const period1Conversion = getConversionRate(period1Funnel);
      const period2Conversion = getConversionRate(period2Funnel);

      if (period1Conversion > 0) {
        const conversionChange = (period2Conversion - period1Conversion) / period1Conversion;
        
        if (Math.abs(conversionChange) >= 0.1) { // 10% change in conversion
          alerts.push({
            type: 'behavior_change',
            category: 'conversion_rate',
            title: `📊 Cambio en tasa de conversión`,
            description: `Conversión vista→estantería ${conversionChange > 0 ? 'mejoró' : 'empeoró'} ${Math.abs(conversionChange * 100).toFixed(1)}%`,
            changePercent: conversionChange,
            data: {
              period1Conversion: (period1Conversion * 100).toFixed(2) + '%',
              period2Conversion: (period2Conversion * 100).toFixed(2) + '%'
            },
            severity: Math.abs(conversionChange) > 0.2 ? 'high' : 'medium',
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      console.error('❌ Error detectando cambios de comportamiento:', error);
    }

    return alerts;
  }

  /**
   * Obtiene alertas recientes (últimos 7 días)
   */
  async getRecentAlerts(days = 7) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Por ahora devolvemos alertas detectadas en tiempo real
    // En el futuro se podrían guardar en una colección de alertas
    return await this.detectTrendChanges();
  }

  /**
   * Configura alertas automáticas cada 6 horas
   */
  static scheduleAutomaticAlerts() {
    // Ejecutar cada 6 horas
    cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('🔔 Ejecutando detección automática de alertas...');
        const alertsService = new AlertsService();
        const alerts = await alertsService.detectTrendChanges();
        
        if (alerts.length > 0) {
          console.log(`📢 ${alerts.length} alertas detectadas:`);
          alerts.forEach(alert => {
            console.log(`  - ${alert.title}: ${alert.description}`);
          });
          
          // Aquí se podría enviar notificaciones por email/slack
          // await NotificationService.sendAlerts(alerts);
        } else {
          console.log('✅ No se detectaron cambios significativos');
        }
        
      } catch (error) {
        console.error('❌ Error en detección automática de alertas:', error);
      }
    });
    
    console.log('⏰ Programador de alertas automáticas iniciado (cada 6 horas)');
  }
}

export default AlertsService;
