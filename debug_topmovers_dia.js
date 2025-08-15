// debug_topmovers_dia.js - Script para debuggear específicamente el período "dia"
import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';

async function debugTopMoversDia() {
  try {
    console.log('🔍 Debugging TopMovers para período "dia"...');
    
    // Fechas para hoy (período actual)
    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    
    // Fechas para ayer (período anterior)
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodDuration);
    const previousEnd = new Date(startDate.getTime());
    
    console.log('📅 Períodos calculados:');
    console.log(`  - HOY: ${startDate.toISOString()} a ${endDate.toISOString()}`);
    console.log(`  - AYER: ${previousStart.toISOString()} a ${previousEnd.toISOString()}`);

    // 1. Verificar actividad HOY
    console.log('\n🔍 Verificando actividad de HOY...');
    const todayActivity = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'reviews.createdAt': { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$_id',
          nombre: { $first: '$nombre' },
          marca: { $first: '$marca' },
          reviewsCount: { $sum: 1 },
          avgRating: { $avg: '$reviews.score' },
          totalLikes: {
            $sum: {
              $cond: {
                if: { $isArray: '$reviews.likes' },
                then: { $size: '$reviews.likes' },
                else: 0
              }
            }
          },
          totalReplies: {
            $sum: {
              $cond: {
                if: { $isArray: '$reviews.replies' },
                then: { $size: '$reviews.replies' },
                else: 0
              }
            }
          }
        }
      },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: ['$reviewsCount', 10] },
              { $multiply: ['$totalLikes', 2] },
              { $multiply: ['$totalReplies', 3] },
              { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] }
            ]
          }
        }
      }
    ]);

    console.log(`📊 Yerbas con actividad HOY: ${todayActivity.length}`);
    todayActivity.forEach((yerba, i) => {
      console.log(`  ${i+1}. ${yerba.marca || 'Sin marca'} ${yerba.nombre || 'Sin nombre'}: Score ${yerba.popularityScore || 0}`);
      console.log(`     Reviews: ${yerba.reviewsCount}, Likes: ${yerba.totalLikes}, Replies: ${yerba.totalReplies}`);
    });

    // 2. Verificar actividad AYER
    console.log('\n🔍 Verificando actividad de AYER...');
    const yesterdayActivity = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'reviews.createdAt': { $gte: previousStart, $lte: previousEnd }
        }
      },
      {
        $group: {
          _id: '$_id',
          nombre: { $first: '$nombre' },
          marca: { $first: '$marca' },
          reviewsCount: { $sum: 1 },
          avgRating: { $avg: '$reviews.score' },
          totalLikes: {
            $sum: {
              $cond: {
                if: { $isArray: '$reviews.likes' },
                then: { $size: '$reviews.likes' },
                else: 0
              }
            }
          },
          totalReplies: {
            $sum: {
              $cond: {
                if: { $isArray: '$reviews.replies' },
                then: { $size: '$reviews.replies' },
                else: 0
              }
            }
          }
        }
      },
      {
        $addFields: {
          popularityScore: {
            $add: [
              { $multiply: ['$reviewsCount', 10] },
              { $multiply: ['$totalLikes', 2] },
              { $multiply: ['$totalReplies', 3] },
              { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] }
            ]
          }
        }
      }
    ]);

    console.log(`📊 Yerbas con actividad AYER: ${yesterdayActivity.length}`);
    yesterdayActivity.forEach((yerba, i) => {
      console.log(`  ${i+1}. ${yerba.marca || 'Sin marca'} ${yerba.nombre || 'Sin nombre'}: Score ${yerba.popularityScore || 0}`);
      console.log(`     Reviews: ${yerba.reviewsCount}, Likes: ${yerba.totalLikes}, Replies: ${yerba.totalReplies}`);
    });

    // 3. Analizar qué TopMovers se generarían
    console.log('\n🔍 Simulando cálculo de TopMovers...');
    
    const previousActivityMap = {};
    yesterdayActivity.forEach(yerba => {
      previousActivityMap[yerba._id.toString()] = yerba;
    });

    const topMovers = [];

    todayActivity.forEach(currentYerba => {
      const yerbaId = currentYerba._id.toString();
      const previousYerba = previousActivityMap[yerbaId] || {
        popularityScore: 0,
        reviewsCount: 0,
        totalLikes: 0,
        totalReplies: 0,
        avgRating: 0
      };

      const currentScore = currentYerba.popularityScore || 0;
      const previousScore = previousYerba.popularityScore || 0;

      let deltaPct = 0;
      let changeType = 'stable';
      
      if (previousScore > 0 && currentScore > 0) {
        deltaPct = ((currentScore - previousScore) / previousScore) * 100;
        deltaPct = Math.max(-200, Math.min(200, deltaPct));
        changeType = deltaPct > 5 ? 'increasing' : deltaPct < -5 ? 'decreasing' : 'stable';
      } else if (currentScore > 0 && previousScore === 0) {
        deltaPct = 100;
        changeType = 'new';
      } else if (currentScore === 0 && previousScore > 0) {
        deltaPct = -100;
        changeType = 'inactive';
      }

      if (currentScore > 0 || previousScore > 0) {
        const entry = {
          label: `${currentYerba.marca || 'Sin marca'} ${currentYerba.nombre || 'Sin nombre'}`,
          yerbaName: currentYerba.nombre,
          yerbaType: currentYerba.marca,
          deltaPct: parseFloat(deltaPct.toFixed(1)),
          currentScore: parseFloat(currentScore.toFixed(1)),
          previousScore: parseFloat(previousScore.toFixed(1)),
          changeType,
          yerbaId: yerbaId
        };

        console.log(`📈 ${entry.label}: ${entry.deltaPct}% (${entry.changeType})`);
        console.log(`   Score: ${entry.previousScore} → ${entry.currentScore}`);
        
        const isValid = entry.label && 
                       entry.changeType && 
                       typeof entry.deltaPct === 'number' && 
                       !isNaN(entry.deltaPct) &&
                       typeof entry.currentScore === 'number' && 
                       !isNaN(entry.currentScore);
        
        console.log(`   ✅ Válido: ${isValid}`);
        
        if (isValid) {
          topMovers.push(entry);
        }
      }
    });

    console.log(`\n📊 Total TopMovers válidos generados: ${topMovers.length}`);
    
    if (topMovers.length === 0) {
      console.log('⚠️ PROBLEMA: No se generaron TopMovers válidos');
      console.log('💡 Posibles causas:');
      console.log('   - No hay actividad hoy');
      console.log('   - No hay actividad ayer para comparar');
      console.log('   - Datos incompletos en la base de datos (falta marca o nombre)');
      
      // Verificar datos de las yerbas
      console.log('\n🔍 Verificando integridad de datos de yerbas...');
      const yerbasWithIssues = await Yerba.find({
        $or: [
          { nombre: { $exists: false } },
          { nombre: '' },
          { marca: { $exists: false } },
          { marca: '' }
        ]
      });
      
      console.log(`📊 Yerbas con datos incompletos: ${yerbasWithIssues.length}`);
      yerbasWithIssues.slice(0, 5).forEach((yerba, i) => {
        console.log(`  ${i+1}. ${yerba._id}: nombre="${yerba.nombre}", marca="${yerba.marca}"`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugTopMoversDia();
