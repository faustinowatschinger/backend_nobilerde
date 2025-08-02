import crypto from 'crypto';

// Generar código de 6 dígitos
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generar código más seguro (alternativo)
const generateSecureCode = () => {
  const bytes = crypto.randomBytes(3);
  return parseInt(bytes.toString('hex'), 16).toString().padStart(6, '0').slice(0, 6);
};

// Verificar formato de código
const isValidCodeFormat = (code) => {
  return /^\d{6}$/.test(code);
};

export {
  generateVerificationCode,
  generateSecureCode,
  isValidCodeFormat
};
