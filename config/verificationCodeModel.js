import { usersConn } from './multiDB.js';
import { Schema } from 'mongoose';

const VerificationCodeSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL para auto-eliminación
  },
  used: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true,
  collection: 'verification_codes'
});

// Índices para optimización
VerificationCodeSchema.index({ email: 1, type: 1 });
VerificationCodeSchema.index({ code: 1 });
VerificationCodeSchema.index({ expiresAt: 1 });

// Limpiar cache del modelo si existe
try {
  usersConn.deleteModel('VerificationCode');
} catch (e) {}

const VerificationCode = usersConn.model('VerificationCode', VerificationCodeSchema);

export default VerificationCode;
