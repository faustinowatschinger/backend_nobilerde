// backend/config/userModel.js
import { usersConn, yerbasConn } from './multiDB.js';
import { Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Importar o crear referencia al modelo Yerba
let Yerba;
try {
  Yerba = yerbasConn.model('Yerba');
} catch {
  // Si no existe, se creará más adelante
}

// Esquema Yerba (para referenciar en shelf)
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
  createdAt:       { type: Date, default: Date.now }
});

// Registro condicional del modelo Yerba para no redefinirlo
try {
  if (!Yerba) {
    Yerba = yerbasConn.model('Yerba');
  }
} catch {
  Yerba = yerbasConn.model('Yerba', YerbaSchema);
}

// Ítem de estantería
const ShelfItemSchema = new Schema({
  yerba:   { type: Schema.Types.ObjectId, ref: 'Yerba', required: true },
  status:  { type: String, enum: ['por probar', 'probada'], default: 'por probar' },
  score:   { type: Number, min: 1, max: 5 },
  comment: { type: String },
  addedAt: { type: Date, default: Date.now }
}, { _id: false });

// Esquema Usuario
const UserSchema = new Schema({
  username:         { type: String, required: true, unique: true },
  nombre:           { type: String, required: true },
  apellido:         { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  password:         { type: String, required: true },
  fechaNacimiento: { type: String, required: true },
  genero:           { type: String },
  nacionalidad:     { type: String },
  tipoMatero: { type: String },
  tipoMate: { type: String },
  termosDia:        { type: Number, required: true },
  role:             { type: String, enum: ['user', 'pro', 'admin'], default: 'user' },
  preferences:      { type: [String], default: [] },
  avatarURL: { type: String, default: '' },
  shelf:            { type: [ShelfItemSchema], default: [] },
  emailVerified:    { type: Boolean, default: false },
  emailVerifiedAt:  { type: Date },
  upgradedAt:       { type: Date }, // Fecha de actualización a Pro
  createdAt:        { type: Date, default: Date.now }
}, { timestamps: false });
UserSchema.pre('findOneAndDelete', async function (next) {
  try {
    const userId = this.getQuery()._id;        // _id que se va a borrar
    if (userId && Yerba) {
      await Yerba.updateMany(
        {},
        { $pull: { reviews: { user: userId } } } // saca reviews del usuario
      );
    }
    next();
  } catch (error) {
    console.error('Error al eliminar reviews del usuario:', error);
    next(error);
  }
});

// 👉 2. Cuando se llama a deleteOne() sobre el doc (doc middleware)
UserSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
  try {
    if (Yerba) {
      await Yerba.updateMany(
        {},
        { $pull: { reviews: { user: this._id } } }
      );
    }
    next();
  } catch (error) {
    console.error('Error al eliminar reviews del usuario:', error);
    next(error);
  }
});
// Hash de contraseña
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Verificación de contraseña
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
// userModel.js
try {
  usersConn.deleteModel('User');       // <-- limpia cache
} catch (e) {}

const User = usersConn.model('User', UserSchema);
export default User;

