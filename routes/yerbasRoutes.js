// routes/yerba.routes.js
import express from 'express';
const router = express.Router();
import { Yerba } from '../config/yerbasModel.js';
import { uploadYerba } from '../config/multerYerbas.js';
import User from '../config/userModel.js';
import EventTracker from '../middleware/eventTracker.js';
import { authenticateToken } from '../auth/middleware/authMiddleware.js';

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

// DEBUG: Endpoint para verificar reviews
router.get('/:id/debug', async (req, res, next) => {
  try {
    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }
    
    res.json({
      yerbaId: yerba._id,
      yerbaNombre: yerba.nombre,
      totalReviews: yerba.reviews.length,
      reviews: yerba.reviews.map(review => ({
        id: review._id.toString(),
        comment: review.comment?.substring(0, 50),
        user: review.user?.toString(),
        repliesCount: review.replies?.length || 0,
        createdAt: review.createdAt
      }))
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
      })
      .populate({
        path: 'reviews.replies.user',
        model: User,
        select: 'username nombre avatarURL'
      });
    if (!yerba) return res.status(404).json({ error: 'Yerba no encontrada' });
    
    // Temporalmente desactivamos el procesamiento jerárquico para debuggear
    const responseYerba = yerba.toObject();
    console.log('Returning yerba with', responseYerba.reviews.length, 'reviews');
    responseYerba.reviews.forEach(review => {
      console.log(`Review ${review._id}: "${review.comment?.substring(0, 30)}" - ${review.replies?.length || 0} replies`);
    });
    
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
    
    res.json(responseYerba);
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

// POST /yerbas/:id/reviews/:reviewId/like
// Dar o quitar like a un review
router.post('/:id/reviews/:reviewId/like', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    const review = yerba.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review no encontrado' });
    }

    const userId = req.userId;
    const hasLiked = review.likes.includes(userId);

    if (hasLiked) {
      // Quitar like
      review.likes.pull(userId);
    } else {
      // Agregar like
      review.likes.push(userId);
    }

    await yerba.save();

    // Track interaction event
    EventTracker.trackEvent(userId, hasLiked ? 'unlike_review' : 'like_review', {
      yerba: req.params.id,
      review: req.params.reviewId,
      sessionId: req.sessionID
    }).catch(error => {
      console.error('Error tracking like/unlike:', error);
    });

    res.json({
      message: hasLiked ? 'Like removido' : 'Like agregado',
      likesCount: review.likes.length,
      hasLiked: !hasLiked
    });
  } catch (err) {
    next(err);
  }
});

// POST /yerbas/:id/reviews/:reviewId/replies
// Agregar respuesta a un review
router.post('/:id/reviews/:reviewId/replies', authenticateToken, async (req, res, next) => {
  try {
    console.log('=== POST Reply to Review ===');
    console.log('Yerba ID:', req.params.id);
    console.log('Review ID:', req.params.reviewId);
    console.log('User ID:', req.userId);
    console.log('Body:', req.body);

    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { comment } = req.body;
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      console.log('Yerba not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    console.log('Yerba found:', yerba.nombre);
    console.log('Total reviews in yerba:', yerba.reviews.length);
    console.log('Review IDs in yerba:', yerba.reviews.map(r => r._id.toString()));

    const review = yerba.reviews.id(req.params.reviewId);
    if (!review) {
      console.log('Review not found with ID:', req.params.reviewId);
      console.log('Available review IDs:', yerba.reviews.map(r => ({ 
        id: r._id.toString(), 
        comment: r.comment?.substring(0, 50) 
      })));
      return res.status(404).json({ error: 'Review no encontrado' });
    }

    console.log('Review found:', review.comment?.substring(0, 50));

    const newReply = {
      user: req.userId,
      comment: comment.trim(),
      likes: [],
      createdAt: new Date()
    };

    review.replies.push(newReply);
    await yerba.save();

    // Populate user data for the response
    await yerba.populate({
      path: 'reviews.replies.user',
      model: User,
      select: 'username nombre avatarURL'
    });

    const savedReply = review.replies[review.replies.length - 1];
    console.log('Reply saved successfully:', savedReply._id);

    // Track interaction event
    EventTracker.trackEvent(req.userId, 'reply_review', {
      yerba: req.params.id,
      review: req.params.reviewId,
      reply: savedReply._id,
      sessionId: req.sessionID
    }).catch(error => {
      console.error('Error tracking reply:', error);
    });

    res.status(201).json(savedReply);
  } catch (err) {
    console.error('Error in reply endpoint:', err);
    next(err);
  }
});

// POST /yerbas/:id/reviews/:reviewId/replies/:replyId/like
// Dar o quitar like a una respuesta
router.post('/:id/reviews/:reviewId/replies/:replyId/like', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    const review = yerba.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review no encontrado' });
    }

    const reply = review.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    const userId = req.userId;
    const hasLiked = reply.likes.includes(userId);

    if (hasLiked) {
      // Quitar like
      reply.likes.pull(userId);
    } else {
      // Agregar like
      reply.likes.push(userId);
    }

    await yerba.save();

    // Track interaction event
    EventTracker.trackEvent(userId, hasLiked ? 'unlike_reply' : 'like_reply', {
      yerba: req.params.id,
      review: req.params.reviewId,
      reply: req.params.replyId,
      sessionId: req.sessionID
    }).catch(error => {
      console.error('Error tracking reply like/unlike:', error);
    });

    res.json({
      message: hasLiked ? 'Like removido' : 'Like agregado',
      likesCount: reply.likes.length,
      hasLiked: !hasLiked
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /yerbas/:id/reviews/:reviewId/replies/:replyId
// Eliminar respuesta (solo el autor o admin)
router.delete('/:id/reviews/:reviewId/replies/:replyId', async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    const review = yerba.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review no encontrado' });
    }

    const reply = review.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }

    // Verificar permisos (solo el autor o admin puede eliminar)
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isAuthor = reply.user.toString() === req.userId;
    const isAdmin = user.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta respuesta' });
    }

    review.replies.pull(req.params.replyId);
    await yerba.save();

    res.json({ message: 'Respuesta eliminada exitosamente' });
  } catch (err) {
    next(err);
  }
});

// POST /yerbas/:id/reviews/:reviewId/replies/:replyId/replies
// Agregar respuesta a una respuesta (respuesta anidada)
router.post('/:id/reviews/:reviewId/replies/:replyId/replies', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { comment } = req.body;
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'El comentario es requerido' });
    }

    const yerba = await Yerba.findById(req.params.id);
    if (!yerba) {
      return res.status(404).json({ error: 'Yerba no encontrada' });
    }

    const review = yerba.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review no encontrado' });
    }

    const parentReply = review.replies.id(req.params.replyId);
    if (!parentReply) {
      return res.status(404).json({ error: 'Respuesta padre no encontrada' });
    }

    const newReply = {
      user: req.userId,
      comment: comment.trim(),
      likes: [],
      parentReply: req.params.replyId,
      createdAt: new Date()
    };

    review.replies.push(newReply);
    await yerba.save();

    // Populate user data for the response
    await yerba.populate({
      path: 'reviews.replies.user',
      model: User,
      select: 'username nombre avatarURL'
    });

    const savedReply = review.replies[review.replies.length - 1];

    // Track interaction event
    EventTracker.trackEvent(req.userId, 'reply_to_reply', {
      yerba: req.params.id,
      review: req.params.reviewId,
      parentReply: req.params.replyId,
      reply: savedReply._id,
      sessionId: req.sessionID
    }).catch(error => {
      console.error('Error tracking nested reply:', error);
    });

    res.status(201).json(savedReply);
  } catch (err) {
    next(err);
  }
});

export default router;
