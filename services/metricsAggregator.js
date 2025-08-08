// backend/services/metricsAggregator.js
import Event from '../config/eventModel.js';
import User from '../config/userModel.js';
import { yerbasConn, usersConn } from '../config/multiDB.js';

/**
 * Servicio para generar métricas agregadas desde eventos de usuario
 * Implementa k-anonimato para proteger privacidad
 */
class MetricsAggregator {
  constructor() {
    this.K_ANONYMITY_THRESHOLD = 50; // Mínimo de usuarios/eventos para incluir en métricas
    this.metricsConn = usersConn; // Usamos la misma conexión para métricas
  }

  /**
   * Ejecuta todas las agregaciones de métricas
   */
  async generateAllMetrics() {
    console.log('🔄 Iniciando generación de métricas agregadas...');
    
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Últimos 90 días
      
      // Ejecutar todas las agregaciones en paralelo
      await Promise.all([
        this.generateTopYerbasMetrics(startDate, endDate),
        this.generateFlavorNotesMetrics(startDate, endDate),
        this.generateTrendMetrics(startDate, endDate),
        this.generateUserBehaviorMetrics(startDate, endDate),
        this.generateDiscoveryMetrics(startDate, endDate)
      ]);
      
      console.log('✅ Métricas agregadas generadas exitosamente');
    } catch (error) {
      console.error('❌ Error generando métricas:', error);
      throw error;
    }
  }

  /**
   * Genera métricas de top yerbas por país y mes
   */
  async generateTopYerbasMetrics(startDate, endDate) {
    console.log('📊 Generando métricas de top yerbas...');
    
    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            type: { $in: ['view_yerba', 'add_shelf', 'rate'] },
            yerba: { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $unwind: '$userData'
        },
        {
          $lookup: {
            from: 'yerbas',
            localField: 'yerba',
            foreignField: '_id',
            as: 'yerbaData'
          }
        },
        {
          $unwind: '$yerbaData'
        },
        {
          $addFields: {
            month: { $dateToString: { format: "%Y-%m", date: "$timestamp" } },
            ageBucket: {
              $switch: {
                branches: [
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 567648000000] }, then: "18-24" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 946080000000] }, then: "25-34" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 1419120000000] }, then: "35-44" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 1892160000000] }, then: "45-54" }
                ],
                default: "55+"
              }
            }
          }
        },
        {
          $group: {
            _id: {
              month: "$month",
              country: "$userData.nacionalidad",
              yerbaId: "$yerba",
              yerbaNombre: "$yerbaData.nombre",
              yerbaMarca: "$yerbaData.marca",
              yerbaPais: "$yerbaData.pais",
              yerbaTipo: "$yerbaData.tipo"
            },
            totalInteractions: { $sum: 1 },
            uniqueUsers: { $addToSet: "$user" },
            avgScore: { $avg: "$score" },
            viewCount: { $sum: { $cond: [{ $eq: ["$type", "view_yerba"] }, 1, 0] } },
            shelfCount: { $sum: { $cond: [{ $eq: ["$type", "add_shelf"] }, 1, 0] } },
            rateCount: { $sum: { $cond: [{ $eq: ["$type", "rate"] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        },
        {
          $match: {
            uniqueUserCount: { $gte: this.K_ANONYMITY_THRESHOLD }
          }
        },
        {
          $project: {
            uniqueUsers: 0 // Remover lista de usuarios por privacidad
          }
        },
        {
          $sort: { 
            "_id.month": -1, 
            "_id.country": 1, 
            "totalInteractions": -1 
          }
        }
      ];

      const results = await Event.aggregate(pipeline);
      
      // Guardar en colección de métricas
      await this.saveMetrics('metrics_top_yerbas', results, { 
        month: 1, 
        country: 1, 
        totalInteractions: -1 
      });
      
      console.log(`✅ Generadas ${results.length} métricas de top yerbas`);
      return results;
    } catch (error) {
      console.error('❌ Error generando métricas de top yerbas:', error);
      throw error;
    }
  }

  /**
   * Genera métricas de notas de sabor más frecuentes
   */
  async generateFlavorNotesMetrics(startDate, endDate) {
    console.log('📊 Generando métricas de notas de sabor...');
    
    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            notes: { $exists: true, $ne: [] }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $unwind: '$userData'
        },
        {
          $unwind: '$notes'
        },
        {
          $addFields: {
            ageBucket: {
              $switch: {
                branches: [
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 567648000000] }, then: "18-24" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 946080000000] }, then: "25-34" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 1419120000000] }, then: "35-44" },
                  { case: { $lt: [{ $subtract: [new Date(), { $dateFromString: { dateString: "$userData.fechaNacimiento" } }] }, 1892160000000] }, then: "45-54" }
                ],
                default: "55+"
              }
            }
          }
        },
        {
          $group: {
            _id: {
              note: "$notes",
              country: "$userData.nacionalidad",
              ageBucket: "$ageBucket",
              gender: "$userData.genero"
            },
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: "$user" }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        },
        {
          $match: {
            uniqueUserCount: { $gte: this.K_ANONYMITY_THRESHOLD }
          }
        },
        {
          $project: {
            uniqueUsers: 0
          }
        },
        {
          $sort: { 
            "_id.country": 1, 
            "_id.ageBucket": 1, 
            "count": -1 
          }
        }
      ];

      const results = await Event.aggregate(pipeline);
      
      await this.saveMetrics('metrics_flavor_notes', results, { 
        '_id.country': 1, 
        '_id.ageBucket': 1, 
        count: -1 
      });
      
      console.log(`✅ Generadas ${results.length} métricas de notas de sabor`);
      return results;
    } catch (error) {
      console.error('❌ Error generando métricas de notas de sabor:', error);
      throw error;
    }
  }

  /**
   * Genera métricas de tendencias temporales
   */
  async generateTrendMetrics(startDate, endDate) {
    console.log('📊 Generando métricas de tendencias...');
    
    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            type: 'rate',
            score: { $exists: true }
          }
        },
        {
          $lookup: {
            from: 'yerbas',
            localField: 'yerba',
            foreignField: '_id',
            as: 'yerbaData'
          }
        },
        {
          $unwind: '$yerbaData'
        },
        {
          $addFields: {
            week: { $dateToString: { format: "%Y-W%U", date: "$timestamp" } }
          }
        },
        {
          $group: {
            _id: {
              week: "$week",
              yerbaTipo: "$yerbaData.tipo",
              containsPalo: "$yerbaData.containsPalo",
              secado: "$yerbaData.secado"
            },
            avgScore: { $avg: "$score" },
            totalRatings: { $sum: 1 },
            uniqueUsers: { $addToSet: "$user" }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        },
        {
          $match: {
            uniqueUserCount: { $gte: this.K_ANONYMITY_THRESHOLD }
          }
        },
        {
          $project: {
            uniqueUsers: 0
          }
        },
        {
          $sort: { 
            "_id.week": -1, 
            "_id.yerbaTipo": 1 
          }
        }
      ];

      const results = await Event.aggregate(pipeline);
      
      await this.saveMetrics('metrics_trends', results, { 
        '_id.week': -1, 
        '_id.yerbaTipo': 1 
      });
      
      console.log(`✅ Generadas ${results.length} métricas de tendencias`);
      return results;
    } catch (error) {
      console.error('❌ Error generando métricas de tendencias:', error);
      throw error;
    }
  }

  /**
   * Genera métricas de comportamiento de usuario
   */
  async generateUserBehaviorMetrics(startDate, endDate) {
    console.log('📊 Generando métricas de comportamiento de usuario...');
    
    try {
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $unwind: '$userData'
        },
        {
          $addFields: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          }
        },
        {
          $group: {
            _id: {
              day: "$day",
              eventType: "$type",
              country: "$userData.nacionalidad"
            },
            eventCount: { $sum: 1 },
            uniqueUsers: { $addToSet: "$user" }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: "$uniqueUsers" }
          }
        },
        {
          $match: {
            uniqueUserCount: { $gte: this.K_ANONYMITY_THRESHOLD }
          }
        },
        {
          $project: {
            uniqueUsers: 0
          }
        },
        {
          $sort: { 
            "_id.day": -1, 
            "_id.eventType": 1 
          }
        }
      ];

      const results = await Event.aggregate(pipeline);
      
      await this.saveMetrics('metrics_user_behavior', results, { 
        '_id.day': -1, 
        '_id.eventType': 1 
      });
      
      console.log(`✅ Generadas ${results.length} métricas de comportamiento`);
      return results;
    } catch (error) {
      console.error('❌ Error generando métricas de comportamiento:', error);
      throw error;
    }
  }

  /**
   * Genera métricas de descubrimiento vs fidelidad
   */
  async generateDiscoveryMetrics(startDate, endDate) {
    console.log('📊 Generando métricas de descubrimiento...');
    
    try {
      // Esta métrica requiere análisis más complejo de patrones de usuario
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
            type: 'add_shelf'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userData'
          }
        },
        {
          $unwind: '$userData'
        },
        {
          $group: {
            _id: {
              user: "$user",
              country: "$userData.nacionalidad"
            },
            yerbasTried: { $addToSet: "$yerba" },
            totalAdds: { $sum: 1 }
          }
        },
        {
          $addFields: {
            uniqueYerbasCount: { $size: "$yerbasTried" }
          }
        },
        {
          $group: {
            _id: {
              country: "$_id.country",
              yerbaRange: {
                $switch: {
                  branches: [
                    { case: { $lte: ["$uniqueYerbasCount", 3] }, then: "1-3" },
                    { case: { $lte: ["$uniqueYerbasCount", 7] }, then: "4-7" },
                    { case: { $lte: ["$uniqueYerbasCount", 15] }, then: "8-15" }
                  ],
                  default: "16+"
                }
              }
            },
            userCount: { $sum: 1 },
            avgYerbasPerUser: { $avg: "$uniqueYerbasCount" },
            totalUsers: { $addToSet: "$_id.user" }
          }
        },
        {
          $addFields: {
            totalUserCount: { $size: "$totalUsers" }
          }
        },
        {
          $match: {
            totalUserCount: { $gte: this.K_ANONYMITY_THRESHOLD }
          }
        },
        {
          $project: {
            totalUsers: 0
          }
        },
        {
          $sort: { 
            "_id.country": 1, 
            "_id.yerbaRange": 1 
          }
        }
      ];

      const results = await Event.aggregate(pipeline);
      
      await this.saveMetrics('metrics_discovery', results, { 
        '_id.country': 1, 
        '_id.yerbaRange': 1 
      });
      
      console.log(`✅ Generadas ${results.length} métricas de descubrimiento`);
      return results;
    } catch (error) {
      console.error('❌ Error generando métricas de descubrimiento:', error);
      throw error;
    }
  }

  /**
   * Guarda métricas en una colección específica con índices optimizados
   */
  async saveMetrics(collectionName, data, indexes = {}) {
    try {
      // Obtener o crear la colección
      const collection = this.metricsConn.db.collection(collectionName);
      
      // Limpiar datos existentes (mantener solo últimos 180 días)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 180);
      
      await collection.deleteMany({
        createdAt: { $lt: cutoffDate }
      });
      
      // Insertar nuevos datos con timestamp
      if (data.length > 0) {
        const documentsToInsert = data.map(doc => ({
          ...doc,
          createdAt: new Date(),
          lastUpdated: new Date()
        }));
        
        await collection.insertMany(documentsToInsert);
      }
      
      // Crear índices si no existen
      if (Object.keys(indexes).length > 0) {
        await collection.createIndex(indexes);
      }
      
      // Índice general para timestamp
      await collection.createIndex({ createdAt: -1 });
      
      console.log(`💾 Guardadas ${data.length} métricas en ${collectionName}`);
    } catch (error) {
      console.error(`❌ Error guardando métricas en ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene métricas desde una colección específica
   */
  async getMetrics(collectionName, filter = {}, limit = 100) {
    try {
      const collection = this.metricsConn.db.collection(collectionName);
      return await collection.find(filter).limit(limit).sort({ createdAt: -1 }).toArray();
    } catch (error) {
      console.error(`❌ Error obteniendo métricas de ${collectionName}:`, error);
      throw error;
    }
  }
}

export default new MetricsAggregator();
