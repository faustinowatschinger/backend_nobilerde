// backend/auth/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { secret } from '../../config/auth.config.js';
import User from '../../config/userModel.js';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'Token no provisto' });
  }

  jwt.verify(token, secret, async (err, payload) => {
    if (err) {
      console.log('❌ Token verification error:', err.message);
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    
    try {
      // Verificar que el usuario existe y tiene email verificado
      const user = await User.findById(payload.id);
      if (!user) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }
      
      if (!user.emailVerified) {
        return res.status(403).json({ 
          error: 'Email no verificado. Verifica tu email para continuar.',
          requiresVerification: true,
          email: user.email
        });
      }
      
      console.log('✅ Token verificado exitosamente');
      console.log('📋 Payload del token:', payload);
      
      req.userId = payload.id;
      req.userRole = payload.role;
      req.user = user;
      
      console.log('👤 Usuario autenticado - ID:', req.userId, 'Role:', req.userRole, 'Email verificado:', user.emailVerified);
      
      next();
    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  });
}

function requireRole(allowedRoles) {
  // Si se pasa un string, convertirlo a array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    console.log('🛡️  Verificando rol - Requerido:', roles, 'Usuario tiene:', req.userRole);
    
    if (!req.userRole) {
      console.log('❌ No hay rol de usuario en req.userRole');
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    if (!roles.includes(req.userRole)) {
      console.log('❌ Rol no autorizado. Requerido:', roles, 'Tiene:', req.userRole);
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    console.log('✅ Rol autorizado:', req.userRole);
    next();
  };
}

export { authenticateToken, requireRole };
