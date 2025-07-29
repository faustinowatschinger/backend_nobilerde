import dotenv from 'dotenv';
dotenv.config();

// Clave secreta para firmar los tokens
const secret = process.env.JWT_SECRET || 'cambia-esta-clave-en-producción';
// Tiempo de expiración (por ejemplo "24h", "7d", etc.)
const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

export { secret, expiresIn };