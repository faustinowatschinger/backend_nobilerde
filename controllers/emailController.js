import VerificationCode from '../config/verificationCodeModel.js';
import User from '../config/userModel.js';
import { sendVerificationEmail } from '../services/emailService.js';
import { generateVerificationCode, isValidCodeFormat } from '../services/codeGenerator.js';
import jwt from 'jsonwebtoken';

// Crear y enviar código de verificación
const createAndSendVerificationCode = async (email, username = '') => {
  try {
    // Limpiar códigos expirados y antiguos para este email
    await VerificationCode.deleteMany({
      $or: [
        { email, used: true },
        { expiresAt: { $lt: new Date() } }
      ]
    });

    // Verificar si ya existe un código válido reciente (últimos 2 minutos)
    const existingCode = await VerificationCode.findOne({
      email,
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
      expiresAt
    });

    // Enviar email
    const emailResult = await sendVerificationEmail(email, code, username);

    if (emailResult.success) {
      console.log(`✅ Código de verificación creado y enviado para ${email}`);
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

// Verificar código de email
const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

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
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verificationCode) {
      // Incrementar intentos si existe el código
      await VerificationCode.updateOne(
        { email, code },
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

  } catch (error) {
    console.error('❌ Error en verifyEmailCode:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
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
  resendVerificationCode
};
