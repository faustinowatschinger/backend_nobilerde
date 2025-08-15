// test_topmovers_periodos.js - Script para verificar TopMovers en diferentes períodos
import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';

// Simular la lógica del servicio de métricas para calcular fechas
function calculatePeriodDates(timePeriod) {
  const now = new Date();
  let calculatedStart, calculatedEnd;

  switch (timePeriod) {
    case 'dia':
      // Para período de día, usar el día completo de hoy (00:00 a 23:59:59) en UTC
      const today = new Date();
      calculatedStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
      calculatedEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
      break;
    case 'semana':
      // Para período de semana, usar los últimos 7 días completos (incluyendo todo el día de hoy) en UTC
      const nowWeek = new Date();
      calculatedEnd = new Date(Date.UTC(nowWeek.getUTCFullYear(), nowWeek.getUTCMonth(), nowWeek.getUTCDate(), 23, 59, 59, 999));
      const weekStart = new Date(nowWeek.getTime() - (6 * 24 * 60 * 60 * 1000)); // 6 días atrás + hoy = 7 días
      calculatedStart = new Date(Date.UTC(weekStart.getUTCFullYear(), weekStart.getUTCMonth(), weekStart.getUTCDate(), 0, 0, 0, 0));
      break;
    case 'mes':
      // Para período de mes, usar las últimas 4 semanas (28 días completos) en UTC
      const nowMonth = new Date();
      calculatedEnd = new Date(Date.UTC(nowMonth.getUTCFullYear(), nowMonth.getUTCMonth(), nowMonth.getUTCDate(), 23, 59, 59, 999));
      const monthStart = new Date(nowMonth.getTime() - (27 * 24 * 60 * 60 * 1000)); // 27 días atrás + hoy = 28 días
      calculatedStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), monthStart.getUTCDate(), 0, 0, 0, 0));
      break;
    default:
      calculatedEnd = now;
      calculatedStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  }

  return { calculatedStart, calculatedEnd };
}

async function getTopMoversForPeriod(timePeriod) {
  const { calculatedStart, calculatedEnd } = calculatePeriodDates(timePeriod);
  
  console.log(`\n🔍 Analizando período: ${timePeriod}`);
  console.log(`📅 Rango: ${calculatedStart.toISOString()} a ${calculatedEnd.toISOString()}`);
  
  // Calcular período anterior para comparación
  const periodDuration = calculatedEnd.getTime() - calculatedStart.getTime();
  const previousStart = new Date(calculatedStart.getTime() - periodDuration);
  const previousEnd = new Date(calculatedStart.getTime());
  
  console.log(`📅 Período anterior: ${previousStart.toISOString()} a ${previousEnd.toISOString()}`);

  // Pipeline para obtener actividad de reviews en período actual
  const currentActivityPipeline = [
    // Desenrollar reviews
    { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
    
    // Filtrar reviews en el período actual
    {
      $match: {
        'reviews.createdAt': {
          $gte: calculatedStart,
          $lte: calculatedEnd
        }
      }
    },
    
    // Calcular score de actividad por yerba
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
    
    // Calcular score de popularidad
    {
      $addFields: {
        popularityScore: {
          $add: [
            { $multiply: ['$reviewsCount', 10] }, // 10 puntos por review
            { $multiply: ['$totalLikes', 2] }, // 2 puntos por like
            { $multiply: ['$totalReplies', 3] }, // 3 puntos por respuesta
            { $multiply: [{ $ifNull: ['$avgRating', 0] }, 5] } // 5 puntos por punto de rating
          ]
        }
      }
    }
  ];

  const currentActivity = await Yerba.aggregate(currentActivityPipeline);
  
  console.log(`📊 Yerbas con actividad en período ${timePeriod}: ${currentActivity.length}`);
  
  if (currentActivity.length > 0) {
    console.log('🔍 Top 3 yerbas más activas:');
    currentActivity
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 3)
      .forEach((yerba, index) => {
        console.log(`  ${index + 1}. ${yerba.marca} ${yerba.nombre}: Score ${yerba.popularityScore.toFixed(1)} (${yerba.reviewsCount} reviews, ${yerba.totalLikes} likes, ${yerba.totalReplies} replies)`);
      });
  } else {
    console.log('⚠️ No se encontró actividad en este período');
  }
  
  return currentActivity;
}

async function testTopMoversPeriodos() {
  try {
    console.log('🔍 Verificando TopMovers para diferentes períodos...');
    
    const periodos = ['dia', 'semana', 'mes'];
    
    for (const periodo of periodos) {
      const activity = await getTopMoversForPeriod(periodo);
      
      // Verificar si hay datos suficientes para calcular cambios
      if (activity.length === 0) {
        console.log(`❌ Período ${periodo}: Sin datos para calcular movimientos`);
      } else {
        console.log(`✅ Período ${periodo}: ${activity.length} yerbas con actividad`);
      }
    }
    
    console.log('\n🎯 Recomendaciones:');
    console.log('- Si "Hoy" no tiene datos, es normal si no hay actividad reciente');
    console.log('- "Últimos 7 días" debería incluir la actividad de hoy');
    console.log('- "Últimas 4 semanas" debería tener la mayor cantidad de datos');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTopMoversPeriodos();
