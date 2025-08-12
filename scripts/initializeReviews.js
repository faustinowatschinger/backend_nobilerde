// Script para inicializar campo reviews en yerbas
import mongoose from 'mongoose';
import { Yerba } from '../config/yerbasModel.js';

async function initializeReviews() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nobilerde');
    console.log('✅ Conectado a MongoDB');

    // Contar yerbas sin reviews
    const countWithoutReviews = await Yerba.countDocuments({ reviews: { $exists: false } });
    console.log('📊 Yerbas sin reviews:', countWithoutReviews);

    // Agregar campo reviews a yerbas que no lo tienen
    const result = await Yerba.updateMany(
      { reviews: { $exists: false } },
      { $set: { reviews: [] } }
    );

    console.log('✅ Yerbas actualizadas:', result.modifiedCount);

    // Verificar todas las yerbas
    const allYerbas = await Yerba.find({}, 'nombre reviews').limit(5);
    console.log('📋 Muestra de yerbas:');
    allYerbas.forEach(yerba => {
      console.log(`  - ${yerba.nombre}: ${yerba.reviews ? yerba.reviews.length : 'undefined'} reviews`);
    });

    await mongoose.disconnect();
    console.log('✅ Inicialización completada');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

initializeReviews();
