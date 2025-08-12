// backend/config/yerbasModel.js
import { yerbasConn } from './multiDB.js';
import mongoose, { Schema } from 'mongoose';
// Esquema para respuestas a reviews (con soporte para respuestas anidadas)
const ReplySchema = new Schema({
  _id:      { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  user:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  comment:  { type: String, required: true },
  likes:    { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  parentReply: { type: Schema.Types.ObjectId, default: null }, // Para respuestas anidadas
  createdAt:{ type: Date, default: Date.now }
});

const ReviewSchema = new Schema({
  _id:      { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  user:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score:    { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String, required: false }, // Cambiado a false para permitir reviews sin comentario
  notes:    { type: [String], default: [] }, // Notas sensoriales del vocabulario controlado
  likes:    { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  replies:  { type: [ReplySchema], default: [] },
  createdAt:{ type: Date, default: Date.now }
});
const YerbaSchema = new Schema({
  nombre:          { type: String },
  marca:           { type: String },
  establecimiento: { type: String },
  tipo:            { type: String },
  containsPalo:    { type: String },
  leafCut:         { type: String },
  origen:          { type: String },
  pais:            { type: String },
  secado:          { type: String },
  tipoEstacionamiento: { type: String },
  tiempoEstacionamiento: { type: String },
  produccion:      { type: String },
  composicion:     { type: [String], default: [] }, // Array para múltiples composiciones en yerbas compuestas
  imagenURL:       { type: String },
  affiliateLink:   { type: String },
  ean:             { type: Number }, // Código EAN para buscar precios
  reviews:         { type: [ReviewSchema], default: [] },
  createdAt:       { type: Date, default: Date.now }
});

// Índice de texto (si tienes el campo ‘sabor’ en el schema, inclúyelo aquí)
YerbaSchema.index({ nombre: 'text', sabor: 'text' });

// Sólo registra el modelo si no existe aún en yerbasConn
const Yerba = yerbasConn.models.Yerba
  ? yerbasConn.models.Yerba
  : yerbasConn.model('Yerba', YerbaSchema);
// Calcula la cantidad de reseñas
YerbaSchema.virtual('reviewsCount').get(function() {
  return this.reviews.length;
});

// Para que salga en toJSON / toObject
YerbaSchema.set('toJSON',   { virtuals: true });
YerbaSchema.set('toObject', { virtuals: true });

export { YerbaSchema, Yerba };
