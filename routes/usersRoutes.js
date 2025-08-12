import express from 'express'
const router = express.Router()
import User from '../config/userModel.js';
import { yerbasConn } from '../config/multiDB.js';
import { authenticateToken } from '../auth/middleware/authMiddleware.js';
import { uploadAvatar } from '../config/multerUsers.js';
import { Yerba } from '../config/yerbasModel.js';
// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// GET /users?username=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { username, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (username) filter.username = new RegExp(username, 'i');

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter)
    ]);

    res.json({
      data,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    next(err);
  }
});
router.get('/:id', async (req, res, next) => {
  try {
    if (req.params.id !== req.userId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate({
        path: 'shelf.yerba',
        model: yerbasConn.model('Yerba'),  // tu modelo Yerba
        populate: {
          path: 'reviews.user',
          model: User,                      // aquí la clase User, no el string "User"
          select: 'username nombre avatarURL'
        }
      });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);

  } catch (err) {
    next(err);
  }
});
// PUT /users/:id
router.put('/:id', async (req, res, next) => {
  try {
    // Campos permitidos para actualizar
    const allowed = [
      'username',
      'nombre',
      'apellido',
      'email',
      'preferences',
      'fechaNacimiento',
      'genero',
      'nacionalidad',
      'tipoMatero',
      'tipoMate',
      'termosDia',
      'avatarURL'
    ];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});


// POST /users/:id/avatar         (autenticado)
router.post('/:id/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se envió archivo' });

    const avatarURL = `${req.protocol}://${req.get('host')}/static/users/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { avatarURL },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ avatarURL });
  } catch (err) {
    next(err);
  }
});


// POST /users/:id/shelf
router.post('/:id/shelf', async (req, res, next) => {
  try {
    const { yerba, status, score, comment, notes } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 1. Verifico si ya existe esa yerba en la estantería
    const yaExiste = user.shelf.some(item =>
      item.yerba.toString() === yerba
    );
    if (yaExiste) {
      return res
        .status(400)
        .json({ error: 'Esa yerba ya está en tu estantería' });
    }

    let reviewId = null;

    // 2. Si tiene score/comment/notes, crear review en la yerba
    if (status === 'probada' && (score || comment || (notes && notes.length > 0))) {
      const yerbaDoc = await Yerba.findById(yerba);
      if (yerbaDoc) {
        const newReview = {
          user: user._id,
          score: score || 3,
          comment: comment || '',
          notes: notes || [],
          likes: [],
          replies: [],
          createdAt: new Date()
        };
        
        yerbaDoc.reviews.push(newReview);
        await yerbaDoc.save();
        
        // Obtener el ID del review recién creado
        reviewId = yerbaDoc.reviews[yerbaDoc.reviews.length - 1]._id;
      }
    }

    // 3. Agregar a la estantería del usuario
    user.shelf.push({ 
      yerba, 
      status, 
      score, 
      comment, 
      notes: notes || [],
      reviewId 
    });
    await user.save();

    // 4. Vuelvo a poblar para devolver el objeto completo
    await user.populate({
      path: 'shelf.yerba',
      model: yerbasConn.model('Yerba')
    });

    res.status(201).json(user.shelf);
  } catch (err) {
    next(err);
  }
});


// PATCH /users/:id/shelf/:yerbaId
router.patch('/:id/shelf/:yerbaId', async (req, res, next) => {
  try {
    const { status, score, comment, notes } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const item = user.shelf.find(i => i.yerba.toString() === req.params.yerbaId);
    if (!item) return res.status(404).json({ error: 'Yerba no encontrada en la estantería' });

    // Actualizar item en shelf
    if (status) item.status = status;
    if (score !== undefined) item.score = score;
    if (comment !== undefined) item.comment = comment;
    if (notes !== undefined) item.notes = notes;

    await user.save();
    await user.populate({
      path: 'shelf.yerba',
      model: yerbasConn.model('Yerba')
    });

    // Actualizar o crear review en la yerba
    const yerbaDoc = await Yerba.findById(req.params.yerbaId);
    if (yerbaDoc) {
      let review = null;
      
      // Buscar review existente
      if (item.reviewId) {
        review = yerbaDoc.reviews.id(item.reviewId);
      } else {
        // Buscar por usuario (para compatibility con datos existentes)
        review = yerbaDoc.reviews.find(r => r.user.toString() === req.params.id);
      }

      if (review) {
        // Actualizar review existente
        if (score !== undefined) review.score = score;
        if (comment !== undefined) review.comment = comment;
        if (notes !== undefined) review.notes = notes;
      } else if (status === 'probada' && (score || comment || (notes && notes.length > 0))) {
        // Crear nuevo review
        const newReview = {
          user: req.params.id,
          score: score || 3,
          comment: comment || '',
          notes: notes || [],
          likes: [],
          replies: [],
          createdAt: new Date()
        };
        
        yerbaDoc.reviews.push(newReview);
        item.reviewId = yerbaDoc.reviews[yerbaDoc.reviews.length - 1]._id;
      }
      
      await yerbaDoc.save();
    }

    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /users/:id/shelf/:yerbaId
router.delete('/:id/shelf/:yerbaId', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.shelf = user.shelf.filter(i => i.yerba.toString() !== req.params.yerbaId);
    await user.save();
    await Yerba.findByIdAndUpdate(req.params.yerbaId, {
  $pull: { reviews: { user: req.params.id } }
});
    res.json({ message: 'Elemento eliminado de la estantería' });
  } catch (err) {
    next(err);
  }
});

export default router;
