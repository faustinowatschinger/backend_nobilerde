// Script simplificado para debug
import mongoose from 'mongoose';
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';

async function debugMigration() {
  try {
    console.log('🔍 Debug de migración...');

    await mongoose.connect('mongodb://localhost:27017/nobilerde');
    console.log('✅ Conectado a MongoDB');

    // Verificar usuarios
    const users = await User.find({ 'shelf.status': 'probada' }).limit(1);
    console.log(`📊 Usuario encontrado:`, users.length > 0);
    
    if (users.length > 0) {
      const user = users[0];
      console.log(`👤 Usuario: ${user.nombre}`);
      console.log(`📚 Shelf items: ${user.shelf.length}`);
      
      for (const item of user.shelf) {
        console.log(`📝 Item status: ${item.status}, notes: ${item.notes ? item.notes.length : 0}`);
        
        if (item.status === 'probada' && item.notes && item.notes.length > 0) {
          console.log(`🔍 Buscando yerba: ${item.yerba}`);
          
          const yerba = await Yerba.findById(item.yerba);
          if (yerba) {
            console.log(`🌿 Yerba encontrada: ${yerba.nombre}`);
            console.log(`📝 Reviews existentes: ${yerba.reviews ? yerba.reviews.length : 'undefined'}`);
            
            if (yerba.reviews) {
              const existingReview = yerba.reviews.find(r => r.user.toString() === user._id.toString());
              console.log(`🔍 Review existente: ${existingReview ? 'Sí' : 'No'}`);
            }
          } else {
            console.log(`❌ Yerba no encontrada`);
          }
          
          break; // Solo procesar el primer item para debug
        }
      }
    }

    await mongoose.disconnect();
    console.log('✅ Debug completado');

  } catch (error) {
    console.error('❌ Error en debug:', error);
    await mongoose.disconnect();
  }
}

debugMigration();
