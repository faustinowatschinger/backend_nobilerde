// backend/config/multiDB.js
import dotenv from 'dotenv';
dotenv.config(); // carga variables antes de usarlas

import mongoose from 'mongoose';

// Conexión a la base de usuarios
const usersConn = mongoose.createConnection(process.env.MONGODB_URI_USERS);

// Conexión a la base de yerbas
const yerbasConn = mongoose.createConnection(process.env.MONGODB_URI_YERBAS);

// Manejo de errores
usersConn.on('error', err => {
  console.error('❌ Error de conexión a Usuarios DB:', err);
});
yerbasConn.on('error', err => {
  console.error('❌ Error de conexión a Yerbas DB:', err);
});

// Logueo al conectar
usersConn.once('open', () => console.log('✅ Usuarios DB conectada'));
yerbasConn.once('open', () => console.log('✅ Yerbas DB conectada'));

export { usersConn, yerbasConn };
