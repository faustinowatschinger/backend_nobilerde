// backend/config/eventModel.js
import { usersConn } from './multiDB.js';
import { Schema } from 'mongoose';

// Esquema para eventos de usuario
const EventSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  eventType: { 
    type: String, 
    required: true,
    enum: [
      'search',
      'view_yerba',
      'shelf_add',
      'shelf_remove', 
      'shelf_rate',
      'shelf_mark_tasted',
      'recommendation_used',
      'login',
      'signup'
    ]
  },
  eventData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sessionId: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'events'
});

// Índices para mejorar performance
EventSchema.index({ userId: 1, timestamp: -1 });
EventSchema.index({ eventType: 1, timestamp: -1 });
EventSchema.index({ timestamp: -1 });

// Modelo
const Event = usersConn.model('Event', EventSchema);

export default Event;
