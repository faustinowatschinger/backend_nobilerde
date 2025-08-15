import mongoose from 'mongoose';
import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';
import metricsService from './services/metricsService.js';

async function debugTopMoversDetallado() {
  try {
    console.log('🔍 Debug detallado de TopMovers...');
    
    console.log('✅ Conexiones establecidas');
    
    // Fechas para hoy vs ayer
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);
    
    console.log('📅 Períodos de tiempo:');
    console.log(`  - HOY: ${todayStart.toISOString()} a ${todayEnd.toISOString()}`);
    console.log(`  - AYER: ${yesterdayStart.toISOString()} a ${yesterdayEnd.toISOString()}`);
    
    // 1. Buscar actividad actual (HOY)
    console.log('\n🔍 Paso 1: Buscando actividad HOY...');
    const currentActivityPipeline = [
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'reviews.createdAt': {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          nombre: { $first: '$nombre' },
          marca: { $first: '$marca' },
          reviewsCount: { $sum: 1 },
          avgRating: { $avg: '$reviews.score' }
        }
      },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: ['$reviewsCount', 10] },
              { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] }
            ]
          }
        }
      }
    ];
    
    const currentActivity = await Yerba.aggregate(currentActivityPipeline);
    console.log(`📊 Yerbas con actividad HOY: ${currentActivity.length}`);
    currentActivity.forEach(yerba => {
      console.log(`  - ${yerba.marca} ${yerba.nombre}: Score ${yerba.popularityScore} (${yerba.reviewsCount} reviews)`);
    });
    
    // 2. Buscar actividad anterior (AYER)
    console.log('\n🔍 Paso 2: Buscando actividad AYER...');
    const previousActivityPipeline = [
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'reviews.createdAt': {
            $gte: yesterdayStart,
            $lte: yesterdayEnd
          }
        }
      },
      {
        $group: {
          _id: '$_id',
          nombre: { $first: '$nombre' },
          marca: { $first: '$marca' },
          reviewsCount: { $sum: 1 },
          avgRating: { $avg: '$reviews.score' }
        }
      },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: ['$reviewsCount', 10] },
              { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] }
            ]
          }
        }
      }
    ];
    
    const previousActivity = await Yerba.aggregate(previousActivityPipeline);
    console.log(`📊 Yerbas con actividad AYER: ${previousActivity.length}`);
    previousActivity.forEach(yerba => {
      console.log(`  - ${yerba.marca} ${yerba.nombre}: Score ${yerba.popularityScore} (${yerba.reviewsCount} reviews)`);
    });
    
    // 3. Comparar y generar TopMovers
    console.log('\n🔍 Paso 3: Generando TopMovers...');
    const previousActivityMap = {};
    previousActivity.forEach(yerba => {
      previousActivityMap[yerba._id.toString()] = yerba;
    });
    
    const topMovers = [];
    
    // Procesar yerbas con actividad actual
    currentActivity.forEach(currentYerba => {
      const yerbaId = currentYerba._id.toString();
      const previousYerba = previousActivityMap[yerbaId] || { popularityScore: 0 };
      
      const currentScore = currentYerba.popularityScore || 0;
      const previousScore = previousYerba.popularityScore || 0;
      
      let deltaPct = 0;
      let changeType = 'stable';
      
      if (previousScore > 0 && currentScore > 0) {
        deltaPct = ((currentScore - previousScore) / previousScore) * 100;
        changeType = deltaPct > 5 ? 'increasing' : deltaPct < -5 ? 'decreasing' : 'stable';
      } else if (currentScore > 0 && previousScore === 0) {
        deltaPct = 100;
        changeType = 'new';
      }
      
      console.log(`  📈 ${currentYerba.marca} ${currentYerba.nombre}: ${deltaPct.toFixed(1)}% (${changeType})`);
      console.log(`    - Actual: ${currentScore}, Anterior: ${previousScore}`);
      
      if (currentYerba.marca && currentYerba.nombre) {
        topMovers.push({
          label: `${currentYerba.marca} ${currentYerba.nombre}`,
          deltaPct: parseFloat(deltaPct.toFixed(1)),
          currentScore: parseFloat(currentScore.toFixed(1)),
          previousScore: parseFloat(previousScore.toFixed(1)),
          changeType
        });
      }
    });
    
    // Procesar yerbas que solo tenían actividad anterior (inactivas)
    Object.keys(previousActivityMap).forEach(yerbaId => {
      if (!currentActivity.find(y => y._id.toString() === yerbaId)) {
        const previousYerba = previousActivityMap[yerbaId];
        const previousScore = previousYerba.popularityScore || 0;
        
        if (previousScore > 0 && previousYerba.marca && previousYerba.nombre) {
          console.log(`  📉 ${previousYerba.marca} ${previousYerba.nombre}: -100.0% (inactive)`);
          console.log(`    - Actual: 0, Anterior: ${previousScore}`);
          
          topMovers.push({
            label: `${previousYerba.marca} ${previousYerba.nombre}`,
            deltaPct: -100.0,
            currentScore: 0,
            previousScore: parseFloat(previousScore.toFixed(1)),
            changeType: 'inactive'
          });
        }
      }
    });
    
    console.log(`\n📊 Total TopMovers generados: ${topMovers.length}`);
    
    // 4. Probar el servicio de métricas real
    console.log('\n🔍 Paso 4: Probando MetricsService real...');
    const realTopMovers = await metricsService.getTopMovers({}, {}, todayStart, todayEnd);
    console.log(`📊 TopMovers del servicio real: ${realTopMovers.length}`);
    
    if (realTopMovers.length > 0) {
      realTopMovers.forEach(mover => {
        console.log(`  - ${mover.label}: ${mover.deltaPct}% (${mover.changeType})`);
        console.log(`    Actual: ${mover.currentScore}, Anterior: ${mover.previousScore}`);
      });
    } else {
      console.log('  ⚠️ El servicio real no devolvió TopMovers');
    }
    
    // 5. Verificar si hay problemas con los datos
    console.log('\n🔍 Paso 5: Verificando integridad de datos...');
    const yerbasConProblemas = await Yerba.find({
      $or: [
        { marca: { $exists: false } },
        { marca: "" },
        { nombre: { $exists: false } },
        { nombre: "" }
      ]
    });
    
    console.log(`📊 Yerbas con datos incompletos: ${yerbasConProblemas.length}`);
    if (yerbasConProblemas.length > 0) {
      yerbasConProblemas.slice(0, 5).forEach(yerba => {
        console.log(`  - ID: ${yerba._id}, marca: "${yerba.marca}", nombre: "${yerba.nombre}"`);
      });
    }
    
    // Cerrar conexiones
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    process.exit(1);
  }
}

debugTopMoversDetallado();
