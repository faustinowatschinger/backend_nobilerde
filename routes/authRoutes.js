
import express from 'express'
import {check, validationResult} from 'express-validator'
import jwt from 'jsonwebtoken'
import User from '../config/userModel.js';
import { secret, expiresIn } from '../config/auth.config.js';

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
      if (await User.findOne({ email })) {
        return res.status(400).json({ error: 'Email ya registrado' });
      }
      if (await User.findOne({ username })) {
        return res.status(400).json({ error: 'Nombre de suario ya existe' });
      }

      // Crear usuario incluyendo los nuevos campos
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
        termosDia
      });
      await newUser.save();

      const token = jwt.sign({ id: newUser._id }, secret, { expiresIn });
      res.status(201).json({ token, message: 'Usuario registrado exitosamente' });
    } catch (err) {
      next(err);
    }
  }
);

// Login de usuario sin cambios
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
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await user.comparePassword(password))) {
        return res.status(400).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign({ id: user._id }, secret, { expiresIn });
      res.json({ token, message: 'Inicio de sesión exitoso' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
