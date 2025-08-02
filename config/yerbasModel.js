// backend/config/yerbasModel.js
import { yerbasConn } from './multiDB.js';
import mongoose, { Schema } from 'mongoose';
const ReviewSchema = new Schema({
  _id:      { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  user:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  score:    { type: Number, min: 1, max: 5, required: true },
  comment:  { type: String, required: true },
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
