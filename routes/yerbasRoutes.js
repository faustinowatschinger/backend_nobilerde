// routes/yerba.routes.js
import express from 'express';
const router = express.Router();
import { Yerba } from '../config/yerbasModel.js';
import { uploadYerba } from '../config/multerYerbas.js';
import User from '../config/userModel.js';
// GET /yerbas?search=&origen=&tipo=&marca=&page=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { search, origen, tipo, marca, establecimiento, containsPalo, leafCut, secado, tipoEstacionamiento, tiempoEstacionamiento, produccion, page = 1, limit = 20 } = req.query;
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

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Yerba.find(filter).skip(skip).limit(Number(limit)),
      Yerba.countDocuments(filter)
    ]);

    res.json({
      data,
      meta: { total, page: Number(page), limit: Number(limit) }
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
    res.json(yerba);
  } catch (err) {
    next(err);
  }
});


// POST /yerbas
router.post('/', uploadYerba.single('foto'), async (req, res, next) => {
  try {
        const imagenURL = req.file
      ? `${req.protocol}://${req.get('host')}/static/yerbas/${req.file.filename}`
      : undefined;

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
    const allowedFields = ['nombre', 'marca', 'establecimiento', 'tipo', 'containsPalo', 'leafCut', 'origen', 'pais', 'secado', 'tipoEstacionamiento', 'tiempoEstacionamiento', 'produccion', 'imagenURL']; // etc.

    const updateData = {};
    for (let key of allowedFields) {
      if (req.body.hasOwnProperty(key)) {
      updateData[key] = req.body[key];
    }
  }
  if (req.file) {
    updateData.imagenURL = `${req.protocol}://${req.get('host')}/static/yerbas/${req.file.filename}`;
  }

  const updatedYerba = await Yerba.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });


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
