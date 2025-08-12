// Script simple para agregar notas sensoriales a usuarios existentes
import mongoose from 'mongoose';
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';
import { getAllValidNotes } from '../config/flavorNotes.js';

// Función para generar notas sensoriales aleatorias
function generateRandomNotes() {
  const validNotes = getAllValidNotes();
  const numNotes = Math.floor(Math.random() * 4) + 1; // Entre 1 y 4 notas
  const selectedNotes = [];
  
  // Seleccionar notas aleatorias sin repetir
  while (selectedNotes.length < numNotes && selectedNotes.length < validNotes.length) {
    const randomNote = validNotes[Math.floor(Math.random() * validNotes.length)];
    if (!selectedNotes.includes(randomNote)) {
      selectedNotes.push(randomNote);
    }
  }
  
  return selectedNotes;
}

async function addNotesToExistingUsers() {
  try {
    console.log('🚀 Agregando notas sensoriales a usuarios existentes...');

    // Conectar a la base de datos
    await mongoose.connect('mongodb://localhost:27017/nobilerde');
    console.log('✅ Conectado a MongoDB');

    // Obtener usuarios y yerbas
    const users = await User.find();
    const yerbas = await Yerba.find();
    
    if (users.length === 0 || yerbas.length === 0) {
      console.log('⚠️ No hay usuarios o yerbas disponibles');
      return;
    }

    console.log(`📊 Trabajando con ${users.length} usuarios y ${yerbas.length} yerbas`);

    let totalItemsAgregados = 0;

    for (const usuario of users) {
      // Si el usuario ya tiene items en el shelf, los mantenemos
      if (!usuario.shelf) usuario.shelf = [];
      
      // Agregar entre 5 y 10 yerbas por usuario si no tiene
      if (usuario.shelf.length === 0) {
        const numYerbas = Math.floor(Math.random() * 6) + 5;
        const yerbasAleatorias = yerbas.sort(() => 0.5 - Math.random()).slice(0, numYerbas);
        
        for (let i = 0; i < yerbasAleatorias.length; i++) {
          const yerba = yerbasAleatorias[i];
          
          // Generar fecha aleatoria en los últimos 60 días
          const diasAtras = Math.floor(Math.random() * 60);
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - diasAtras);
          
          // Status: 80% probada, 20% por probar
          const status = Math.random() < 0.8 ? 'probada' : 'por probar';
          
          // Score aleatorio si está probada
          const score = status === 'probada' ? Math.floor(Math.random() * 5) + 1 : null;
          
          // Generar notas sensoriales si está probada
          const notes = status === 'probada' ? generateRandomNotes() : [];
          
          const shelfItem = {
            yerba: yerba._id,
            addedAt: fecha,
            status: status,
            score: score,
            notes: notes
          };
          
          usuario.shelf.push(shelfItem);
          totalItemsAgregados++;
        }
        
        await usuario.save();
        console.log(`✅ Usuario ${usuario.nombre}: ${numYerbas} items agregados`);
      } else {
        // Agregar notas a items existentes que están probados pero no tienen notas
        let updated = false;
        
        for (const item of usuario.shelf) {
          if (item.status === 'probada' && (!item.notes || item.notes.length === 0)) {
            item.notes = generateRandomNotes();
            updated = true;
          }
        }
        
        if (updated) {
          await usuario.save();
          console.log(`✅ Usuario ${usuario.nombre}: notas agregadas a items existentes`);
        }
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`  - Total items agregados: ${totalItemsAgregados}`);
    
    // Verificar datos finales
    const usuariosConShelf = await User.countDocuments({ shelf: { $exists: true, $ne: [] } });
    const usuariosConProbada = await User.countDocuments({ 'shelf.status': 'probada' });
    const usuariosConNotas = await User.countDocuments({ 'shelf.notes': { $exists: true, $ne: [] } });
    
    console.log(`  - Usuarios con estantería: ${usuariosConShelf}`);
    console.log(`  - Usuarios con yerbas probadas: ${usuariosConProbada}`);
    console.log(`  - Usuarios con notas sensoriales: ${usuariosConNotas}`);

    await mongoose.disconnect();
    console.log('✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar
addNotesToExistingUsers();
