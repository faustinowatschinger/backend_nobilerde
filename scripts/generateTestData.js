// Script para generar datos de prueba realistas para el sistema de métricas
import mongoose from 'mongoose';
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';
import { getAllValidNotes } from '../config/flavorNotes.js';

// Configuración de conexión
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nobilerde';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    process.exit(1);
  }
}

async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  } catch (error) {
    console.error('❌ Error desconectando de MongoDB:', error);
  }
}

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

async function generateTestData() {
  console.log('🚀 Generando datos de prueba para el sistema de métricas...\n');

  try {
    // 1. Verificar si ya existen datos
    const existingUsers = await User.countDocuments();
    const existingYerbas = await Yerba.countDocuments();
    
    console.log(`📊 Estado actual de la base de datos:`);
    console.log(`  - Usuarios: ${existingUsers}`);
    console.log(`  - Yerbas: ${existingYerbas}`);

    if (existingUsers > 0 && existingYerbas > 0) {
      console.log('\n⚠️ Ya existen datos en la base de datos');
      console.log('💡 Este script está diseñado para bases de datos vacías');
      console.log('🔄 Si quieres continuar, se agregarán datos adicionales');
      
      const shouldContinue = process.argv.includes('--force');
      if (!shouldContinue) {
        console.log('\n💡 Para forzar la ejecución, usa: node scripts/generateTestData.js --force');
        return;
      }
    }

    // 2. Crear tipos de yerba si no existen
    console.log('\n🌿 2. CREANDO TIPOS DE YERBA');
    console.log('=' .repeat(50));
    
    const tiposYerba = [
      'Tradicional',
      'Despalada', 
      'Suave',
      'Orgánica',
      'Barbacuá',
      'Premium/Selección',
      'Compuesta'
    ];

    // Verificar si ya existen yerbas con tipos
    const yerbasConTipo = await Yerba.countDocuments({ tipo: { $exists: true, $ne: null } });
    
    if (yerbasConTipo === 0) {
      console.log('📝 Asignando tipos a yerbas existentes...');
      
      // Obtener todas las yerbas sin tipo
      const yerbasSinTipo = await Yerba.find({ tipo: { $exists: false } });
      
      for (const yerba of yerbasSinTipo) {
        // Asignar tipo aleatorio
        const tipoAleatorio = tiposYerba[Math.floor(Math.random() * tiposYerba.length)];
        yerba.tipo = tipoAleatorio;
        await yerba.save();
      }
      
      console.log(`✅ Tipos asignados a ${yerbasSinTipo.length} yerbas`);
    } else {
      console.log(`✅ Ya existen ${yerbasConTipo} yerbas con tipos definidos`);
    }

    // 3. Crear usuarios de prueba si no existen
    console.log('\n👥 3. CREANDO USUARIOS DE PRUEBA');
    console.log('=' .repeat(50));
    
    if (existingUsers === 0) {
      console.log('📝 Creando usuarios de prueba...');
      
      const usuariosPrueba = [
        { nombre: 'Juan Pérez', nacionalidad: 'Argentina', edad: 28, genero: 'Masculino' },
        { nombre: 'María González', nacionalidad: 'Uruguay', edad: 32, genero: 'Femenino' },
        { nombre: 'Carlos López', nacionalidad: 'Argentina', edad: 25, genero: 'Masculino' },
        { nombre: 'Ana Silva', nacionalidad: 'Brasil', edad: 29, genero: 'Femenino' },
        { nombre: 'Roberto Torres', nacionalidad: 'Paraguay', edad: 35, genero: 'Masculino' }
      ];

      for (const usuarioData of usuariosPrueba) {
        const usuario = new User({
          ...usuarioData,
          email: `${usuarioData.nombre.toLowerCase().replace(' ', '.')}@test.com`,
          password: 'test123',
          shelf: []
        });
        await usuario.save();
      }
      
      console.log(`✅ ${usuariosPrueba.length} usuarios de prueba creados`);
    } else {
      console.log(`✅ Ya existen ${existingUsers} usuarios`);
    }

    // 4. Agregar yerbas a estanterías de usuarios
    console.log('\n📚 4. AGREGANDO YERBAS A ESTANTERÍAS');
    console.log('=' .repeat(50));
    
    const usuarios = await User.find();
    const yerbas = await Yerba.find();
    
    if (usuarios.length === 0 || yerbas.length === 0) {
      console.log('⚠️ No hay usuarios o yerbas para trabajar');
      return;
    }

    console.log(`📝 Agregando yerbas a estanterías de ${usuarios.length} usuarios...`);
    
    let totalItemsAgregados = 0;
    
    for (const usuario of usuarios) {
      // Agregar entre 3 y 8 yerbas por usuario
      const numYerbas = Math.floor(Math.random() * 6) + 3;
      const yerbasAleatorias = yerbas.sort(() => 0.5 - Math.random()).slice(0, numYerbas);
      
      for (let i = 0; i < yerbasAleatorias.length; i++) {
        const yerba = yerbasAleatorias[i];
        
        // Generar fecha aleatoria en los últimos 30 días
        const diasAtras = Math.floor(Math.random() * 30);
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - diasAtras);
        
        // Status aleatorio: 70% probada, 30% en estantería
        const status = Math.random() < 0.7 ? 'probada' : 'en estantería';
        
        // Score aleatorio si está probada
        const score = status === 'probada' ? Math.floor(Math.random() * 5) + 1 : null;
        
        const shelfItem = {
          yerba: yerba._id,
          addedAt: fecha,
          status: status,
          score: score,
          notes: status === 'probada' ? generateRandomNotes() : []
        };
        
        if (!usuario.shelf) usuario.shelf = [];
        usuario.shelf.push(shelfItem);
        totalItemsAgregados++;
      }
      
      await usuario.save();
    }
    
    console.log(`✅ ${totalItemsAgregados} items agregados a estanterías`);

    // 5. Verificar datos generados
    console.log('\n📊 5. VERIFICANDO DATOS GENERADOS');
    console.log('=' .repeat(50));
    
    const usuariosFinal = await User.countDocuments();
    const yerbasFinal = await Yerba.countDocuments();
    const usuariosConShelf = await User.countDocuments({ shelf: { $exists: true, $ne: [] } });
    const usuariosConProbada = await User.countDocuments({ 'shelf.status': 'probada' });
    
    console.log(`📈 Resumen final:`);
    console.log(`  - Usuarios totales: ${usuariosFinal}`);
    console.log(`  - Yerbas totales: ${yerbasFinal}`);
    console.log(`  - Usuarios con estantería: ${usuariosConShelf}`);
    console.log(`  - Usuarios con yerbas probadas: ${usuariosConProbada}`);
    
    // Contar total de items en estanterías
    const totalItems = await User.aggregate([
      { $unwind: '$shelf' },
      { $count: 'total' }
    ]);
    
    if (totalItems.length > 0) {
      console.log(`  - Total items en estanterías: ${totalItems[0].total}`);
    }
    
    // Contar items por status
    const itemsPorStatus = await User.aggregate([
      { $unwind: '$shelf' },
      { $group: { _id: '$shelf.status', count: { $sum: 1 } } }
    ]);
    
    console.log(`  - Items por status:`);
    itemsPorStatus.forEach(item => {
      console.log(`    * ${item._id}: ${item.count}`);
    });

    console.log('\n🎉 Datos de prueba generados exitosamente!');
    console.log('💡 Ahora puedes probar el dashboard con datos reales');

  } catch (error) {
    console.error('❌ Error generando datos de prueba:', error);
  }
}

// Ejecutar script
async function main() {
  await connectDB();
  await generateTestData();
  await disconnectDB();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateTestData };
