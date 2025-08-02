// backend/adminPanel.js
import dotenv from 'dotenv';
dotenv.config(); // carga .env

import express from 'express';
import mongoose from 'mongoose';
import connectMongo from 'connect-mongo';
import AdminJS, { ComponentLoader } from 'adminjs';
import * as AdminJSMongoose from '@adminjs/mongoose';
import AdminJSExpress from '@adminjs/express';

import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';

// 1) Registrar el adaptador de Mongoose
AdminJS.registerAdapter({
  Resource: AdminJSMongoose.Resource,
  Database: AdminJSMongoose.Database,
});

// Crear un cargador de componentes
const componentLoader = new ComponentLoader();

const admin = new AdminJS({
  rootPath: '/admin',
  resources: [
    {
      resource: Yerba,
      options: {
        // Columnas en la vista de lista
        listProperties: ['nombre', 'marca', 'reviewsCount'],
        // Campos en la vista de detalle (show)
        showProperties: [
          'nombre',
          'marca',
          'establecimiento',
          'tipo',
          'containsPalo',
          'leafCut',
          'origen',
          'pais',
          'secado',
          'tipoEstacionamiento',
          'tiempoEstacionamiento',
          'produccion',
          'imagenURL',
          'affiliateLink',
          'reviewsCount',
          'reviews',
        ],
        // Campos en el formulario de edición
        editProperties: [
          'nombre',
          'marca',
          'establecimiento',
          'tipo',
          'containsPalo',
          'leafCut',
          'origen',
          'pais',
          'secado',
          'tipoEstacionamiento',
          'tiempoEstacionamiento',
          'produccion',
          'imagenURL',
          'affiliateLink',
          'reviews',
        ],
        properties: {
          // Campo virtual para contar reseñas
          reviewsCount: {
            type: 'number',
            label: 'Cant. reseñas',
            isVisible: { list: true, show: true, edit: false, filter: false },
          },
          // Configuración del array de reviews
          reviews: {
            type: 'mixed',
            isArray: true,
            label: 'Reseñas',
            isVisible: { 
              list: false, 
              filter: false, 
              show: true, 
              edit: true 
            },
            subProperties: {
              _id: {
                type: 'string',
                isVisible: false,
              },
              user: {
                type: 'reference',
                reference: 'User',
                label: 'Usuario',
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              score: {
                type: 'number',
                label: 'Puntuación',
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              comment: {
                type: 'textarea',
                label: 'Comentario',
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
              createdAt: {
                type: 'datetime',
                label: 'Fecha de creación',
                isVisible: { list: false, filter: false, show: true, edit: true },
              },
            },
            // Remove custom components for now
          },
        },
      },
    },
    {
      resource: User,
      options: {
        properties: {
          password: {
            isVisible: { list: false, filter: false, show: false, edit: true },
          },
        },
      },
    },
  ],
  componentLoader,
  branding: {
    companyName: 'App Yerba Mate',
    softwareBrothers: false,
  },
});

// 2) Conectar Mongoose a la BD de usuarios (utilizada internamente por AdminJS)
await mongoose.connect(process.env.MONGODB_URI_USERS);

// 3) Montar router autenticado
const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
  admin,
  {
    authenticate: async (email, password) => {
      const adminUser = await User.findOne({ 
        email, 
        role: { $in: ['admin', 'pro'] } 
      });
      if (!adminUser) return null;
      const match = await adminUser.comparePassword(password);
      return match ? adminUser : null;
    },
    cookieName: 'adminjs',
    cookiePassword: process.env.JWT_SECRET,
  },
  null,
  {
    store: connectMongo.create({ mongoUrl: process.env.MONGODB_URI_USERS }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.JWT_SECRET,
    cookie: { secure: false }, // poné true si usás HTTPS
  }
);

// 4) Iniciar Express
const app = express();
app.use(admin.options.rootPath, adminRouter);

const PORT = process.env.PORT1 || 5000;
app.listen(PORT, () => {
  console.log(
    `🚀 Admin corriendo en http://localhost:${PORT}${admin.options.rootPath}`
  );
});
