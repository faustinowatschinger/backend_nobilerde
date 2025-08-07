import VerificationCode from '../config/verificationCodeModel.js';
import User from '../config/userModel.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';
import { generateVerificationCode, isValidCodeFormat } from '../services/codeGenerator.js';
import jwt from 'jsonwebtoken';

// Crear y enviar código de verificación
const createAndSendVerificationCode = async (email, type = 'email_verification', username = '') => {
  try {
    // Limpiar códigos expirados y antiguos para este email y tipo
    await VerificationCode.deleteMany({
      $or: [
        { email, type, used: true },
        { email, type, expiresAt: { $lt: new Date() } }
      ]
    });

    // Verificar si ya existe un código válido reciente (últimos 2 minutos)
    const existingCode = await VerificationCode.findOne({
      email,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
      createdAt: { $gt: new Date(Date.now() - 2 * 60 * 1000) } // Últimos 2 minutos
    });

    if (existingCode) {
      return {
        success: false,
        message: 'Ya enviamos un código recientemente. Espera 2 minutos antes de solicitar otro.'
      };
    }

    // Generar nuevo código
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en base de datos
    await VerificationCode.create({
      email,
      code,
      type,
      expiresAt
    });

    // Enviar email según el tipo
    let emailResult;
    if (type === 'password_reset') {
      emailResult = await sendPasswordResetEmail(email, code, username);
    } else {
      emailResult = await sendVerificationEmail(email, code, username);
    }

    if (emailResult.success) {
      console.log(`✅ Código de verificación (${type}) creado y enviado para ${email}`);
      return {
        success: true,
        message: 'Código de verificación enviado correctamente'
      };
    } else {
      // Si falla el envío, eliminar el código de la DB
      await VerificationCode.deleteOne({ email, code });
      return {
        success: false,
        message: 'Error al enviar el email de verificación'
      };
    }
  } catch (error) {
    console.error('❌ Error en createAndSendVerificationCode:', error);
    return {
      success: false,
      message: 'Error interno del servidor'
    };
  }
};

// Función auxiliar para verificar código (sin Express response)
const verifyCodeInternal = async (email, code, type = 'email_verification') => {
  try {
    // Validaciones básicas
    if (!email || !code) {
      return {
        success: false,
        message: 'Email y código son requeridos'
      };
    }

    if (!isValidCodeFormat(code)) {
      return {
        success: false,
        message: 'Formato de código inválido'
      };
    }

    // Buscar código en base de datos
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      type,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verificationCode) {
      // Incrementar intentos si existe el código
      await VerificationCode.updateOne(
        { email, code, type },
        { $inc: { attempts: 1 } }
      );

      return {
        success: false,
        message: 'Código inválido o expirado'
      };
    }

    // Verificar intentos excesivos
    if (verificationCode.attempts >= 3) {
      return {
        success: false,
        message: 'Demasiados intentos. Solicita un nuevo código'
      };
    }

    // Marcar código como usado
    verificationCode.used = true;
    await verificationCode.save();

    // Limpiar códigos antiguos para este email y tipo
    await VerificationCode.deleteMany({
      email,
      type,
      _id: { $ne: verificationCode._id }
    });

    return {
      success: true,
      message: 'Código verificado correctamente'
    };

  } catch (error) {
    console.error('❌ Error en verifyCodeInternal:', error);
    return {
      success: false,
      message: 'Error interno del servidor'
    };
  }
};

// Verificar código de email (Express middleware)
const verifyEmailCode = async (req, res) => {
  try {
    const { email, code, type = 'email_verification' } = req.body;

    // Validaciones básicas
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email y código son requeridos'
      });
    }

    if (!isValidCodeFormat(code)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de código inválido'
      });
    }

    // Buscar código en base de datos
    const verificationCode = await VerificationCode.findOne({
      email,
      code,
      type,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verificationCode) {
      // Incrementar intentos si existe el código
      await VerificationCode.updateOne(
        { email, code, type },
        { $inc: { attempts: 1 } }
      );

      return res.status(400).json({
        success: false,
        message: 'Código inválido o expirado'
      });
    }

    // Verificar intentos excesivos
    if (verificationCode.attempts >= 3) {
      await VerificationCode.updateOne(
        { _id: verificationCode._id },
        { used: true }
      );

      return res.status(400).json({
        success: false,
        message: 'Demasiados intentos. Solicita un nuevo código.'
      });
    }

    // Solo para verificación de email necesitamos buscar el usuario
    if (type === 'email_verification') {
      // Buscar usuario
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Marcar código como usado
      await VerificationCode.updateOne(
        { _id: verificationCode._id },
        { used: true }
      );

      // Marcar email como verificado
      await User.updateOne(
        { _id: user._id },
        { 
            emailVerified: true,
          emailVerifiedAt: new Date()
        }
      );

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          emailVerified: true
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '30d' }
      );

      // Limpiar códigos antiguos para este email
      await VerificationCode.deleteMany({ email });

      console.log(`✅ Email verificado exitosamente para ${email}`);

      res.json({
        success: true,
        message: 'Email verificado correctamente',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          emailVerified: true
        }
      });
    } else {
      // Para reset de contraseña, solo marcar código como usado y retornar éxito
      await VerificationCode.updateOne(
        { _id: verificationCode._id },
        { used: true }
      );

      console.log(`✅ Código de reset de contraseña verificado para ${email}`);

      return {
        success: true,
        message: 'Código verificado correctamente'
      };
    }

  } catch (error) {
    console.error('❌ Error en verifyEmailCode:', error);
    
    // Si es un request/response normal, usar res.status
    if (res && res.status) {
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    } else {
      // Si es llamado internamente, retornar objeto
      return {
        success: false,
        message: 'Error interno del servidor'
      };
    }
  }
};

// Reenviar código de verificación
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email es requerido'
      });
    }

    // Verificar que el usuario existe y no está verificado
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'El email ya está verificado'
      });
    }

    // Crear y enviar nuevo código
    const result = await createAndSendVerificationCode(email, user.username);

    if (result.success) {
      res.json({
        success: true,
        message: 'Código de verificación reenviado'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }

  } catch (error) {
    console.error('❌ Error en resendVerificationCode:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export {
  createAndSendVerificationCode,
  verifyEmailCode,
  verifyCodeInternal,
  resendVerificationCode
};
