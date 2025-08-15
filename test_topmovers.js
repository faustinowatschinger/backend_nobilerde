// Script para probar el nuevo TopMovers basado en reviews
import metricsService from './services/metricsService.js';

try {
  console.log('🚀 Probando getTopMovers con datos reales...');
  
  // Probemos con un rango de fechas amplio que incluya 2025
  const filters = {
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    timePeriod: 'año'
  };
  
  console.log('📋 Filtros:', filters);
  
  const result = await metricsService.getOverviewData(filters);
  
  console.log('✅ Resultado obtenido:');
  console.log('TopMovers encontrados:', result.topMovers?.length || 0);
  
  if (result.topMovers && result.topMovers.length > 0) {
    console.log('\n📈 Top Movers:');
    result.topMovers.forEach((mover, idx) => {
      console.log(`${idx + 1}. ${mover.label}`);
      console.log(`   Cambio: ${mover.deltaPct > 0 ? '+' : ''}${mover.deltaPct}% (${mover.changeType})`);
      console.log(`   Score: ${mover.previousScore} → ${mover.currentScore}`);
      console.log(`   Reviews: ${mover.previousReviews || 0} → ${mover.currentReviews || 0}`);
      console.log(`   Likes: ${mover.previousLikes || 0} → ${mover.currentLikes || 0}`);
      console.log(`   Respuestas: ${mover.previousReplies || 0} → ${mover.currentReplies || 0}`);
      console.log('');
    });
  } else {
    console.log('❌ No se encontraron top movers');
    console.log('Resultado completo:', JSON.stringify(result, null, 2));
  }
  
} catch (error) {
  console.error('❌ Error ejecutando getTopMovers:', error);
} finally {
  process.exit(0);
}
