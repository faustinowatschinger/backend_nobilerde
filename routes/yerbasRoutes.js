// routes/yerba.routes.js
import express from 'express';
const router = express.Router();
import { Yerba } from '../config/yerbasModel.js';
import { uploadYerba } from '../config/multerYerbas.js';
import User from '../config/userModel.js';
import EventTracker from '../middleware/eventTracker.js';

// Middleware para convertir URLs relativas a absolutas
const convertImageUrls = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(data) {
    const currentHost = `${req.protocol}://${req.get('host')}`;
    
    // Función recursiva para procesar cualquier objeto con protección contra referencias circulares
    function processObject(obj, visited = new WeakSet()) {
      // Evitar referencias circulares
      if (visited.has(obj)) {
        return;
      }
      
      if (Array.isArray(obj)) {
        visited.add(obj);
        obj.forEach(item => {
          if (item && typeof item === 'object') {
            processObject(item, visited);
          }
        });
      } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
        visited.add(obj);
        
        // Procesar imagenURL
        if (obj.imagenURL && typeof obj.imagenURL === 'string' && obj.imagenURL.startsWith('/static/')) {
          obj.imagenURL = `${currentHost}${obj.imagenURL}`;
        }
        
        // Procesar avatarURL
        if (obj.avatarURL && typeof obj.avatarURL === 'string' && obj.avatarURL.startsWith('/static/')) {
          obj.avatarURL = `${currentHost}${obj.avatarURL}`;
        }
        
        // Procesar solo propiedades propias del objeto (no heredadas)
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            if (value && typeof value === 'object') {
              processObject(value, visited);
            }
          }
        }
      }
    }
    
    processObject(data);
    return originalJson.call(this, data);
  };
  next();
};

// Aplicar middleware a todas las rutas
router.use(convertImageUrls);

// DEBUG: Endpoint para verificar URLs de imágenes (debe ir después del middleware)
router.get('/debug/images', async (req, res, next) => {
  try {
    const sample = await Yerba.findOne({});
    const currentHost = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      message: 'Debug de imágenes',
      currentHost,
      sampleYerba: sample, // Devolver el objeto completo para que el middleware lo procese
      testImageUrl: `${currentHost}/static/yerbas/amanda_despalada.jpg`
    });
  } catch (err) {
    next(err);
  }
});

// GET /yerbas?search=&origen=&tipo=&marca=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { search, origen, tipo, marca, establecimiento, containsPalo, leafCut, secado, tipoEstacionamiento, tiempoEstacionamiento, produccion, composicion, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (origen)  filter.origen = origen;
    if (tipo)    filter.tipo = tipo;
    if (marca)   filter.marca = marca;
    if (establecimiento) filter.establecimiento = establecimiento;
    if (containsPalo) filter.containsPalo = containsPalo;
    if (leafCut) filter.leafCut = leafCut;
    if (secado) filter.secado = secado;
    if (tipoEstacionamiento) filter.tipoEstacionamiento = tipoEstacionamiento;
    if (tiempoEstacionamiento) filter.tiempoEstacionamiento = tiempoEstacionamiento;
    if (produccion) filter.produccion = produccion;
    if (composicion) filter.composicion = composicion;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Yerba.find(filter).skip(skip).limit(Number(limit)),
      Yerba.countDocuments(filter)
    ]);

    // Convertir URLs manualmente
    const currentHost = `${req.protocol}://${req.get('host')}`;
    console.log('🔧 Convirtiendo URLs manualmente. Host:', currentHost);
    const dataWithUrls = data.map(yerba => {
      const yerbaObj = yerba.toObject();
      console.log('📝 Yerba original:', yerbaObj.nombre, yerbaObj.imagenURL);
      if (yerbaObj.imagenURL && yerbaObj.imagenURL.startsWith('/static/')) {
        yerbaObj.imagenURL = `${currentHost}${yerbaObj.imagenURL}`;
        console.log('✅ Convertida a:', yerbaObj.imagenURL);
      }
      return yerbaObj;
    });

    // Track search event si hay usuario autenticado
    if (req.userId && (search || Object.keys(filter).length > 0)) {
      const appliedFilters = [];
      if (origen) appliedFilters.push(`origen:${origen}`);
      if (tipo) appliedFilters.push(`tipo:${tipo}`);
      if (marca) appliedFilters.push(`marca:${marca}`);
      if (containsPalo) appliedFilters.push(`containsPalo:${containsPalo}`);
      if (leafCut) appliedFilters.push(`leafCut:${leafCut}`);
      if (secado) appliedFilters.push(`secado:${secado}`);
      if (produccion) appliedFilters.push(`produccion:${produccion}`);
      
      EventTracker.trackSearch(req.userId, search, appliedFilters, total).catch(error => {
        console.error('Error tracking search:', error);
      });
    }

    res.json({
      data: dataWithUrls,
      meta: { 
        totalItems: total, 
        totalPages: Math.ceil(total / Number(limit)),
        currentPage: Number(page), 
        limit: Number(limit),
        hasMore: skip + dataWithUrls.length < total
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /yerbas/:id
router.get('/:id', async (req, res, next) => {
  try {
    const yerba = await Yerba.findById(req.params.id)
      .populate({
        path: 'reviews.user',
        model: User, // Usa la clase User importada, no el string 'User'
        select: 'username nombre avatarURL'
      });
    if (!yerba) return res.status(404).json({ error: 'Yerba no encontrada' });
    
    // Track view event si hay usuario autenticado
    if (req.userId) {
      EventTracker.trackEvent(req.userId, 'view_yerba', {
        yerba: req.params.id,
        sessionId: req.sessionID,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }).catch(error => {
        console.error('Error tracking view_yerba:', error);
        // No fallar la request por error de tracking
      });
    }
    
    res.json(yerba);
  } catch (err) {
    next(err);
  }
});


// POST /yerbas
router.post('/', uploadYerba.single('foto'), async (req, res, next) => {
  try {
    // Generar URL de imagen de forma más consistente
    const imagenURL = req.file
      ? `/static/yerbas/${req.file.filename}`
      : null;

    const newYerba = new Yerba({
      ...req.body,
      ...(imagenURL && { imagenURL })
    });
    
    const saved = await newYerba.save();
    
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', uploadYerba.single('foto'), async (req, res, next) => {
  try {
    const allowedFields = ['nombre', 'marca', 'establecimiento', 'tipo', 'containsPalo', 'leafCut', 'origen', 'pais', 'secado', 'tipoEstacionamiento', 'tiempoEstacionamiento', 'produccion', 'composicion', 'imagenURL', 'ean'];

    const updateData = {};
    for (let key of allowedFields) {
      if (req.body.hasOwnProperty(key)) {
        updateData[key] = req.body[key];
      }
    }
    
    // Manejar imagen nueva de forma más robusta
    if (req.file) {
      updateData.imagenURL = `/static/yerbas/${req.file.filename}`;
    }

    const updatedYerba = await Yerba.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!updatedYerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    res.json(updatedYerba);
  } catch (err) {
    next(err);
  }
});


// DELETE /yerbas/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await Yerba.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Yerba no encontrada' });
    res.json({ message: 'Yerba eliminada' });
  } catch (err) {
    next(err);
  }
});

export default router;
