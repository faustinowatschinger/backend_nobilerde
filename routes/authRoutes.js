import express from 'express'
import {check, validationResult} from 'express-validator'
import jwt from 'jsonwebtoken'
import User from '../config/userModel.js';
import { secret, expiresIn } from '../config/auth.config.js';
import { createAndSendVerificationCode, verifyEmailCode, resendVerificationCode } from '../controllers/emailController.js';

const router = express.Router();

import dotenv from 'dotenv';
dotenv.config();
// Registro de usuario
router.post(
  '/register',
  [
    check('username').isLength({ min: 3 }).withMessage('Usuario debe tener al menos 3 caracteres'),
    check('nombre').isLength({ min: 1 }).withMessage('Nombre es requerido'),
    check('apellido').isLength({ min: 1 }).withMessage('Apellido es requerido'),
    check('email').isEmail().withMessage('Email inválido'),
    check('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres'),
    check('fechaNacimiento').exists().withMessage('Fecha de nacimiento es requerida').isISO8601().withMessage('Fecha inválida (debe usar AAAA-MM-DD)'),
    check('genero').isLength({ min: 1 }).withMessage('Genero es requerido'),
    check('nacionalidad').optional().isString().withMessage('Nacionalidad inválida'),
    check('termosDia').optional().isInt({ min: 0 }).withMessage('Termos por día inválido')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const {
        username,
        nombre,
        apellido,
        email,
        password,
        fechaNacimiento,
        genero,
        nacionalidad,
        tipoMatero,
        tipoMate,
        termosDia
      } = req.body;

      // Verificar si ya existe email o usuario
      const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
      });

      if (existingUser) {
        if (existingUser.email === email) {
          if (existingUser.emailVerified) {
            return res.status(400).json({ 
              success: false,
              message: 'Este email ya está registrado y verificado' 
            });
          } else {
            // Usuario existe pero no verificado, reenviar código
            const result = await createAndSendVerificationCode(email, username);
            return res.json({
              success: true,
              message: 'Usuario ya registrado. Se ha enviado un nuevo código de verificación.',
              requiresVerification: true
            });
          }
        } else {
          return res.status(400).json({ 
            success: false,
            message: 'Este nombre de usuario ya está en uso' 
          });
        }
      }

      // Crear usuario incluyendo los nuevos campos (sin verificar)
      const newUser = new User({
        username,
        nombre,
        apellido,
        email,
        password,
        fechaNacimiento,
        genero,
        nacionalidad,
        tipoMatero,
        tipoMate,
        termosDia,
        emailVerified: false // Importante: empieza como false
      });
      await newUser.save();

      // Enviar código de verificación
      const verificationResult = await createAndSendVerificationCode(email, username);

      if (verificationResult.success) {
        console.log(`✅ Usuario registrado: ${username} (${email})`);
        res.status(201).json({
          success: true,
          message: 'Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.',
          requiresVerification: true
        });
      } else {
        // Si falla el envío de email, eliminar usuario creado
        await User.deleteOne({ _id: newUser._id });
        res.status(500).json({
          success: false,
          message: 'Error al enviar email de verificación. Intenta nuevamente.'
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// Login de usuario con verificación de email
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Email inválido'),
    check('password').exists().withMessage('Contraseña es requerida')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          message: errors.array()[0].msg 
        });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ 
          success: false,
          message: 'Credenciales inválidas' 
        });
      }

      // Verificar si el email está verificado
      if (!user.emailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Debes verificar tu email antes de iniciar sesión',
          requiresVerification: true,
          email: user.email
        });
      }

      const token = jwt.sign({ 
        id: user._id, 
        role: user.role,
        emailVerified: user.emailVerified
      }, secret, { expiresIn });
      
      console.log(`✅ Login exitoso: ${user.username}`);

      res.json({ 
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          emailVerified: user.emailVerified
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// Rutas de verificación de email
router.post('/verify-email', verifyEmailCode);
router.post('/resend-verification', resendVerificationCode);

export default router;
