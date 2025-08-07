import mongoose from 'mongoose';
import { usersConn } from './multiDB.js';

const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Formato de email inválido']
  },
  source: {
    type: String,
    default: 'unknown',
    enum: ['landing-page', 'app', 'social-media', 'referral', 'unknown']
  },
  active: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  },
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
newsletterSchema.index({ email: 1 });
newsletterSchema.index({ active: 1 });
newsletterSchema.index({ subscribedAt: -1 });

export const Newsletter = usersConn.model('Newsletter', newsletterSchema);
