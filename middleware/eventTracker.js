// backend/middleware/eventTracker.js
import Event from '../config/eventModel.js';

/**
 * Middleware para tracking automático de eventos de usuario
 * Se puede usar para capturar automáticamente ciertas acciones sin modificar cada controlador
 */
class EventTracker {
  
  /**
   * Middleware para tracking automático basado en rutas
   */
  static autoTrack() {
    return async (req, res, next) => {
      // Guardar referencia al método original de res.json
      const originalJson = res.json;
      
      // Sobrescribir res.json para interceptar respuestas exitosas
      res.json = function(data) {
        // Solo trackear si la respuesta es exitosa
        if (data && data.success !== false && res.statusCode < 400) {
          // Ejecutar tracking en background para no afectar la respuesta
          EventTracker.trackFromRequest(req, res, data).catch(error => {
            console.error('❌ Error en auto-tracking:', error);
          });
        }
        
        // Llamar al método original
        return originalJson.call(this, data);
      };
      
      next();
    };
  }

  /**
   * Trackea eventos basado en la información de la request
   */
  static async trackFromRequest(req, res, responseData) {
    try {
      const userId = req.userId || req.user?._id;
      if (!userId) return; // No trackear si no hay usuario autenticado
      
      const eventData = EventTracker.extractEventFromRequest(req, res, responseData);
      if (!eventData) return; // No hay evento que trackear
      
      // Agregar información adicional del request
      eventData.user = userId;
      eventData.sessionId = req.sessionID || req.headers['x-session-id'];
      eventData.userAgent = req.headers['user-agent'];
      eventData.ipAddress = req.ip || req.connection.remoteAddress;
      
      await Event.createEvent(eventData);
      
    } catch (error) {
      console.error('❌ Error en trackFromRequest:', error);
    }
  }

  /**
   * Extrae información del evento basado en la ruta y método HTTP
   */
  static extractEventFromRequest(req, res, responseData) {
    const { method, path, body, query, params } = req;
    
    // Mapear rutas a eventos
    const routeMap = {
      // Yerbas
      'GET /yerbas/:id': { type: 'view_yerba', yerba: params.id },
      'GET /yerbas': { type: 'search', searchQuery: query.q, filters: EventTracker.extractFilters(query) },
      
      // Estantería
      'POST /users/:userId/shelf': { type: 'add_shelf', yerba: body.yerba },
      'PATCH /users/:userId/shelf/:yerbaId': { 
        type: 'update_shelf', 
        yerba: params.yerbaId,
        score: body.score,
        previousValue: body.previousStatus,
        newValue: body.status
      },
      'DELETE /users/:userId/shelf/:yerbaId': { type: 'remove_shelf', yerba: params.yerbaId },
      
      // IA y Recomendaciones
      'POST /ai/interpret-yerba': { type: 'ai_request', searchQuery: body.prompt },
      'POST /ai/recommend': { type: 'ai_request' },
      'GET /recommendations': { type: 'recommendation_view' },
      
      // Usuario
      'PUT /users/:id': { type: 'profile_update' },
      'POST /auth/login': { type: 'login' },
      'POST /auth/register': { type: 'signup' }
    };
    
    // Construir clave de ruta
    const routeKey = `${method} ${EventTracker.normalizeRoute(path)}`;
    
    const eventTemplate = routeMap[routeKey];
    if (!eventTemplate) return null;
    
    // Resolver valores dinámicos
    const eventData = {};
    for (const [key, value] of Object.entries(eventTemplate)) {
      if (typeof value === 'string' && value.startsWith('params.')) {
        eventData[key] = params[value.substring(7)];
      } else if (typeof value === 'string' && value.startsWith('body.')) {
        eventData[key] = body[value.substring(5)];
      } else if (typeof value === 'string' && value.startsWith('query.')) {
        eventData[key] = query[value.substring(6)];
      } else {
        eventData[key] = value;
      }
    }
    
    return eventData;
  }

  /**
   * Normaliza rutas para matching (convierte parámetros a placeholders)
   */
  static normalizeRoute(path) {
    return path
      .replace(/\/[0-9a-fA-F]{24}/g, '/:id') // ObjectIds de MongoDB
      .replace(/\/\d+/g, '/:id') // IDs numéricos
      .replace(/\/[^\/]+$/g, '/:param'); // Último segmento como parámetro
  }

  /**
   * Extrae filtros aplicados desde query parameters
   */
  static extractFilters(query) {
    const filterKeys = [
      'marca', 'tipo', 'containsPalo', 'leafCut', 'origen', 
      'pais', 'secado', 'tipoEstacionamiento', 'produccion'
    ];
    
    return filterKeys
      .filter(key => query[key] && query[key] !== '')
      .map(key => `${key}:${query[key]}`);
  }

  /**
   * Método manual para trackear eventos específicos
   */
  static async trackEvent(userId, eventType, eventData = {}) {
    try {
      if (!userId || !eventType) {
        throw new Error('userId y eventType son requeridos');
      }
      
      const fullEventData = {
        user: userId,
        type: eventType,
        ...eventData,
        timestamp: new Date()
      };
      
      return await Event.createEvent(fullEventData);
      
    } catch (error) {
      console.error('❌ Error en trackEvent manual:', error);
      throw error;
    }
  }

  /**
   * Trackea evento de rating/puntuación
   */
  static async trackRating(userId, yerbaId, score, notes = [], comment = '') {
    try {
      return await EventTracker.trackEvent(userId, 'rate', {
        yerba: yerbaId,
        score: score,
        notes: notes,
        comment: comment
      });
    } catch (error) {
      console.error('❌ Error tracking rating:', error);
      throw error;
    }
  }

  /**
   * Trackea evento de búsqueda con filtros
   */
  static async trackSearch(userId, searchQuery, filters = [], results = 0) {
    try {
      return await EventTracker.trackEvent(userId, 'search', {
        searchQuery: searchQuery,
        filters: filters,
        resultsCount: results
      });
    } catch (error) {
      console.error('❌ Error tracking search:', error);
      throw error;
    }
  }

  /**
   * Trackea eventos de IA
   */
  static async trackAIInteraction(userId, prompt, interpretation = null, recommendationsCount = 0) {
    try {
      return await EventTracker.trackEvent(userId, 'ai_request', {
        searchQuery: prompt,
        notes: interpretation ? Object.values(interpretation).filter(v => v) : [],
        resultsCount: recommendationsCount
      });
    } catch (error) {
      console.error('❌ Error tracking AI interaction:', error);
      throw error;
    }
  }

  /**
   * Trackea patrones de comportamiento de sesión
   */
  static async trackSessionPattern(userId, sessionId, events) {
    try {
      // Analizar patrones de la sesión
      const sessionData = {
        sessionDuration: Date.now() - events[0]?.timestamp,
        totalEvents: events.length,
        eventTypes: [...new Set(events.map(e => e.type))],
        yerbaViews: events.filter(e => e.type === 'view_yerba').length,
        searches: events.filter(e => e.type === 'search').length
      };
      
      return await EventTracker.trackEvent(userId, 'session_summary', {
        sessionId: sessionId,
        notes: [
          `duration:${Math.round(sessionData.sessionDuration / 1000)}s`,
          `events:${sessionData.totalEvents}`,
          `types:${sessionData.eventTypes.length}`
        ]
      });
      
    } catch (error) {
      console.error('❌ Error tracking session pattern:', error);
      throw error;
    }
  }

  /**
   * Obtiene eventos recientes de un usuario
   */
  static async getUserRecentEvents(userId, limit = 50) {
    try {
      return await Event.find({ user: userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('❌ Error obteniendo eventos de usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas básicas de eventos
   */
  static async getEventStats(startDate, endDate) {
    try {
      const stats = await Event.aggregate([
        {
          $match: {
            timestamp: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$user' }
          }
        },
        {
          $addFields: {
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        {
          $project: {
            uniqueUsers: 0
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      return stats;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de eventos:', error);
      throw error;
    }
  }
}

export default EventTracker;
