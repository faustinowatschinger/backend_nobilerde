// backend/config/eventModel.js
import { usersConn } from './multiDB.js';
import { Schema } from 'mongoose';

// Esquema de Evento para tracking de interacciones de usuarios
const EventSchema = new Schema({
  // Referencias
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  yerba: { 
    type: Schema.Types.ObjectId, 
    ref: 'Yerba', 
    required: false // Algunos eventos no están relacionados con una yerba específica
  },
  
  // Tipo de evento
  type: { 
    type: String, 
    required: true,
    enum: [
      'view_yerba',        // Usuario ve detalles de una yerba
      'search',            // Usuario realiza búsqueda
      'filter_applied',    // Usuario aplica filtros
      'add_shelf',         // Usuario agrega yerba a estantería
      'update_shelf',      // Usuario actualiza status/score en estantería
      'remove_shelf',      // Usuario remueve yerba de estantería
      'rate',              // Usuario califica una yerba
      'comment',           // Usuario comenta sobre una yerba
      'ai_request',        // Usuario usa funcionalidad de IA
      'recommendation_view', // Usuario ve recomendaciones
      'profile_update',    // Usuario actualiza perfil
      'login',             // Usuario inicia sesión
      'signup'             // Usuario se registra
    ]
  },
  
  // Datos contextuales del evento
  filters: [String],       // Filtros aplicados (ej: ["con_palo", "molienda_fina"])
  searchQuery: String,     // Query de búsqueda si aplica
  score: {                 // Puntuación si aplica (1-5)
    type: Number,
    min: 1,
    max: 5
  },
  notes: [String],         // Notas de sabor/características (ej: ["amargo_alto", "herbal"])
  previousValue: String,   // Valor anterior (útil para updates)
  newValue: String,        // Nuevo valor (útil para updates)
  
  // Metadatos técnicos
  sessionId: String,       // ID de sesión para agrupar acciones
  userAgent: String,       // Información del cliente
  ipAddress: String,       // IP (hasheada por privacidad)
  
  // Timestamp
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true  // Índice para queries temporales
  }
}, {
  timestamps: false, // Usamos nuestro campo timestamp personalizado
  collection: 'events' // Nombre explícito de la colección
});

// Índices para optimizar consultas de agregación
EventSchema.index({ type: 1, timestamp: -1 });
EventSchema.index({ user: 1, timestamp: -1 });
EventSchema.index({ yerba: 1, timestamp: -1 });
EventSchema.index({ type: 1, user: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1, type: 1 }); // Para métricas temporales

// Método estático para crear evento de forma segura
EventSchema.statics.createEvent = async function(eventData) {
  try {
    // Validar datos obligatorios
    if (!eventData.user || !eventData.type) {
      throw new Error('User y type son campos obligatorios');
    }
    
    // Sanitizar datos sensibles
    const sanitizedData = {
      ...eventData,
      ipAddress: eventData.ipAddress ? hashIP(eventData.ipAddress) : undefined,
      userAgent: eventData.userAgent ? sanitizeUserAgent(eventData.userAgent) : undefined
    };
    
    const event = new this(sanitizedData);
    return await event.save();
  } catch (error) {
    console.error('Error creando evento:', error);
    throw error;
  }
};

// Método para obtener eventos agregados por período
EventSchema.statics.getAggregatedEvents = async function(startDate, endDate, groupBy = 'day') {
  const groupFormat = {
    day: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
    week: { $dateToString: { format: "%Y-W%U", date: "$timestamp" } },
    month: { $dateToString: { format: "%Y-%m", date: "$timestamp" } }
  };
  
  return await this.aggregate([
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
        _id: {
          period: groupFormat[groupBy],
          type: "$type"
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
      $project: {
        uniqueUsers: 0 // No incluir la lista de usuarios en el resultado
      }
    },
    {
      $sort: { "_id.period": -1, "_id.type": 1 }
    }
  ]);
};

// Funciones auxiliares para sanitización
function hashIP(ip) {
  // Hashear IP para mantener privacidad pero permitir análisis de patrones
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

function sanitizeUserAgent(userAgent) {
  // Mantener solo información relevante del user agent
  const basicInfo = userAgent.match(/(Android|iPhone|iPad|Windows|Mac|Linux)/i);
  return basicInfo ? basicInfo[0] : 'Unknown';
}

// Middleware pre-save para validaciones adicionales
EventSchema.pre('save', function(next) {
  // Validar que score solo esté presente en eventos que lo requieren
  const scoreRequiredEvents = ['rate', 'update_shelf'];
  if (scoreRequiredEvents.includes(this.type) && !this.score) {
    return next(new Error(`Score es requerido para eventos de tipo ${this.type}`));
  }
  
  // Validar que yerba esté presente en eventos que lo requieren
  const yerbaRequiredEvents = ['view_yerba', 'add_shelf', 'update_shelf', 'remove_shelf', 'rate', 'comment'];
  if (yerbaRequiredEvents.includes(this.type) && !this.yerba) {
    return next(new Error(`Yerba es requerida para eventos de tipo ${this.type}`));
  }
  
  next();
});

// Limpiar modelo existente si existe
try {
  usersConn.deleteModel('Event');
} catch (e) {
  // Modelo no existe, continuar
}

const Event = usersConn.model('Event', EventSchema);
export default Event;
