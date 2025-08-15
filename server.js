import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import { usersConn, yerbasConn } from './config/multiDB.js';

const app = express();
app.use(cors());
app.use(express.json());

import { Yerba } from './config/yerbasModel.js';
import User from './config/userModel.js';

// --- Routers
import userRoutes  from './routes/usersRoutes.js';
import yerbaRoutes from './routes/yerbasRoutes.js';
import authRoutes  from './routes/authRoutes.js';
import recommendationsRoutes from './routes/recommendationsRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';

// --- Services
import { AlertsService } from './services/alertsService.js';
import metricsService from './services/metricsService.js';


// Inicializar métricas al iniciar el servidor (solo en desarrollo)
if (process.env.NODE_ENV === 'development' || process.env.METRICS_DEV_MODE === 'true') {
  setTimeout(async () => {
    try {
      console.log('🚀 Generando métricas iniciales...');
      // Las métricas se generan bajo demanda desde el dashboard
      console.log('✅ Servicio de métricas inicializado');
    } catch (error) {
      console.error('❌ Error inicializando métricas:', error.message);
    }
  }, 3000); // 3 segundos después de iniciar el servidor
}

// Inicializar alertas automáticas
AlertsService.scheduleAutomaticAlerts();

// --- Test route for debugging
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working', timestamp: new Date() });
});

// Montar rutas
app.use('/users',  userRoutes);
app.use('/yerbas', yerbaRoutes);
app.use('/auth',   authRoutes);
app.use('/api',    recommendationsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api',    newsletterRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/metrics', metricsRoutes);

console.log('📋 Routes mounted:');
console.log('  - /users');
console.log('  - /yerbas');
console.log('  - /auth');
console.log('  - /api (recommendations)');
console.log('  - /api/ai');
console.log('  - /api (newsletter)');
console.log('  - /api/dashboard');
console.log('  - /api/metrics');

// STATIC  ─ sirve las imágenes que realmente viven en public/yerbas
app.use(
  '/static/yerbas',
  express.static(path.join(process.cwd(), 'public', 'yerbas'), {
    maxAge: '30d',
    immutable: true,
  })
);

// LISTADO de imágenes disponibles
app.get('/api/imagenes-yerbas', async (req, res) => {
  try {
    // ⬇️  Mismo directorio que el static
    const dir   = path.join(process.cwd(), 'public', 'yerbas');
    const files = await fs.readdir(dir);

    const urls  = files
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .map(f => `${req.protocol}://${req.get('host')}/static/yerbas/${encodeURIComponent(f)}`);

    res.json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se listaron las imágenes' });
  }
});
app.use(
  '/static/users',
  express.static(path.join(process.cwd(), 'public', 'users'), {
    maxAge: '30d',
    immutable: true,
  })
);


// Health-check
app.get('/healthcheck', (_req, res) => {
  res.json({
    usersDB:  usersConn.readyState  === 1 ? 'connected' : 'disconnected',
    yerbasDB: yerbasConn.readyState === 1 ? 'connected' : 'disconnected',
    uptime:   process.uptime(),
  });
});

// Handler genérico de errores
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Ha ocurrido un error interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});

export default app;
