// Test para verificar datos reales en la base de datos
import mongoose from 'mongoose';
import { MetricsService } from '../services/metricsService.js';
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';

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

async function testDataVerification() {
  console.log('🔍 Verificando datos reales en la base de datos...\n');

  try {
    // 1. Verificar usuarios y sus estanterías
    console.log('📊 1. ANÁLISIS DE USUARIOS Y ESTANTERÍAS');
    console.log('=' .repeat(50));
    
    const totalUsers = await User.countDocuments();
    console.log(`Total usuarios: ${totalUsers}`);
    
    const usersWithShelf = await User.countDocuments({ shelf: { $exists: true, $ne: [] } });
    console.log(`Usuarios con estantería: ${usersWithShelf}`);
    
    const usersWithProbada = await User.countDocuments({
      'shelf.status': 'probada'
    });
    console.log(`Usuarios con yerbas probadas: ${usersWithProbada}`);
    
    // Verificar estructura de shelf
    const sampleUser = await User.findOne({ shelf: { $exists: true, $ne: [] } });
    if (sampleUser && sampleUser.shelf.length > 0) {
      console.log('\n📋 Estructura de shelf de usuario de ejemplo:');
      console.log('Campos disponibles:', Object.keys(sampleUser.shelf[0]));
      console.log('Status disponibles:', [...new Set(sampleUser.shelf.map(item => item.status))]);
      console.log('Tipos de yerba en shelf:', [...new Set(sampleUser.shelf.map(item => item.yerba?.toString()).filter(Boolean))]);
    }

    // 2. Verificar yerbas y tipos
    console.log('\n🌿 2. ANÁLISIS DE YERBAS Y TIPOS');
    console.log('=' .repeat(50));
    
    const totalYerbas = await Yerba.countDocuments();
    console.log(`Total yerbas: ${totalYerbas}`);
    
    const yerbasWithTipo = await Yerba.countDocuments({ tipo: { $exists: true, $ne: null } });
    console.log(`Yerbas con tipo definido: ${yerbasWithTipo}`);
    
    const tiposDisponibles = await Yerba.distinct('tipo');
    console.log(`Tipos de yerba disponibles: ${tiposDisponibles.join(', ')}`);
    
    // Verificar estructura de yerba
    const sampleYerba = await Yerba.findOne();
    if (sampleYerba) {
      console.log('\n📋 Estructura de yerba de ejemplo:');
      console.log('Campos disponibles:', Object.keys(sampleYerba));
      console.log('Tipo:', sampleYerba.tipo);
      console.log('Marca:', sampleYerba.marca);
      console.log('Nombre:', sampleYerba.nombre);
    }

    // 3. Verificar catas reales en el período actual
    console.log('\n📅 3. ANÁLISIS DE CATAS EN PERÍODO ACTUAL');
    console.log('=' .repeat(50));
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`Período analizado: ${startOfDay.toISOString()} a ${endOfDay.toISOString()}`);
    
    // Contar catas en el día actual
    const catasHoy = await User.aggregate([
      {
        $match: {
          'shelf.status': 'probada',
          'shelf.addedAt': { $gte: startOfDay, $lt: endOfDay }
        }
      },
      {
        $project: {
          catas: {
            $filter: {
              input: '$shelf',
              as: 'item',
              cond: {
                $and: [
                  { $eq: ['$$item.status', 'probada'] },
                  { $gte: ['$$item.addedAt', startOfDay] },
                  { $lt: ['$$item.addedAt', endOfDay] }
                ]
              }
            }
          }
        }
      },
      {
        $match: { 'catas.0': { $exists: true } }
      }
    ]);
    
    console.log(`Usuarios con catas hoy: ${catasHoy.length}`);
    
    if (catasHoy.length > 0) {
      console.log('\n📋 Detalle de catas de hoy:');
      catasHoy.forEach((user, index) => {
        console.log(`Usuario ${index + 1}: ${user.catas.length} catas`);
        user.catas.forEach(cata => {
          console.log(`  - Yerba: ${cata.yerba}, Fecha: ${cata.addedAt}`);
        });
      });
    }

    // 4. Verificar datos de los últimos 7 días
    console.log('\n📅 4. ANÁLISIS DE CATAS EN ÚLTIMOS 7 DÍAS');
    console.log('=' .repeat(50));
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const catas7Dias = await User.aggregate([
      {
        $match: {
          'shelf.status': 'probada',
          'shelf.addedAt': { $gte: sevenDaysAgo, $lte: now }
        }
      },
      {
        $project: {
          catas: {
            $filter: {
              input: '$shelf',
              as: 'item',
              cond: {
                $and: [
                  { $eq: ['$$item.status', 'probada'] },
                  { $gte: ['$$item.addedAt', sevenDaysAgo] },
                  { $lte: ['$$item.addedAt', now] }
                ]
              }
            }
          }
        }
      },
      {
        $match: { 'catas.0': { $exists: true } }
      }
    ]);
    
    console.log(`Usuarios con catas en últimos 7 días: ${catas7Dias.length}`);
    
    // 5. Verificar si hay datos para generar métricas reales
    console.log('\n🔧 5. VERIFICACIÓN PARA MÉTRICAS REALES');
    console.log('=' .repeat(50));
    
    const metricsService = new MetricsService();
    
    // Probar getTypeBreakdown
    console.log('\n📊 Probando getTypeBreakdown...');
    const typeBreakdown = await metricsService.getTypeBreakdown({}, {}, startOfDay, endOfDay);
    console.log('Resultado getTypeBreakdown:', typeBreakdown);
    
    // Probar getTopMovers
    console.log('\n📈 Probando getTopMovers...');
    const topMovers = await metricsService.getTopMovers({}, {}, startOfDay, endOfDay);
    console.log('Resultado getTopMovers:', topMovers);

    // 6. Recomendaciones
    console.log('\n💡 6. RECOMENDACIONES');
    console.log('=' .repeat(50));
    
    if (catasHoy.length === 0) {
      console.log('❌ No hay catas en el día actual');
      console.log('💡 Posibles causas:');
      console.log('   - Los usuarios no están marcando yerbas como "probada"');
      console.log('   - El campo "status" en shelf no es "probada"');
      console.log('   - Las fechas en "addedAt" no están en el formato correcto');
      console.log('   - No hay datos reales en la base de datos');
    } else {
      console.log('✅ Hay catas disponibles para generar métricas');
    }
    
    if (yerbasWithTipo === 0) {
      console.log('❌ No hay yerbas con tipo definido');
      console.log('💡 Necesitas asignar tipos a las yerbas existentes');
    }
    
    if (usersWithProbada === 0) {
      console.log('❌ No hay usuarios con yerbas marcadas como "probada"');
      console.log('💡 Los usuarios deben marcar yerbas como "probada" en su estantería');
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

// Ejecutar test
async function main() {
  await connectDB();
  await testDataVerification();
  await disconnectDB();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testDataVerification };
