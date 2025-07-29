// backend/auth/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { secret } from '../../config/auth.config.js';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Token no provisto' });
  }

  jwt.verify(token, secret, (err, payload) => {
    if (err) {
      console.log('Token verification error:', err);
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    req.userId = payload.id;
    req.userRole = payload.role;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.userRole) return res.status(401).json({ error: 'No autorizado' });
    if (req.userRole !== role) return res.status(403).json({ error: 'Acceso denegado' });
    next();
  };
}

export { authenticateToken, requireRole };
