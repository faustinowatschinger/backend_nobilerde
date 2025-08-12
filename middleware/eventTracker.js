// backend/middleware/eventTracker.js
import mongoose from 'mongoose';

/**
 * Middleware para rastrear eventos de usuario
 */
class EventTracker {
  
  /**
   * Rastrea búsquedas de yerbas
   */
  static async trackSearch(userId, searchQuery, filters, resultCount) {
    try {
      // Por ahora solo loggeamos - se puede extender para guardar en BD
      console.log('🔍 Search tracked:', {
        userId,
        searchQuery,
        filters,
        resultCount,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }

  /**
   * Rastrea eventos generales
   */
  static async trackEvent(userId, eventType, eventData = {}) {
    try {
      // Por ahora solo loggeamos - se puede extender para guardar en BD
      console.log('📊 Event tracked:', {
        userId,
        eventType,
        eventData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  /**
   * Rastrea visualizaciones de yerbas
   */
  static async trackView(userId, yerbaId, additionalData = {}) {
    try {
      return this.trackEvent(userId, 'view_yerba', {
        yerbaId,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  }

  /**
   * Rastrea interacciones con shelf
   */
  static async trackShelfAction(userId, action, yerbaId, additionalData = {}) {
    try {
      return this.trackEvent(userId, 'shelf_action', {
        action, // 'add', 'remove', 'rate', 'mark_tasted'
        yerbaId,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking shelf action:', error);
    }
  }

  /**
   * Rastrea uso de recomendaciones
   */
  static async trackRecommendation(userId, recommendationType, yerbaIds, additionalData = {}) {
    try {
      return this.trackEvent(userId, 'recommendation_used', {
        recommendationType,
        yerbaIds,
        ...additionalData
      });
    } catch (error) {
      console.error('Error tracking recommendation:', error);
    }
  }
}

export default EventTracker;
