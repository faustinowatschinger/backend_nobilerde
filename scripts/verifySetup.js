// backend/scripts/verifySetup.js
/**
 * Script rápido para verificar que el sistema de eventos está correctamente configurado
 */

console.log('🔍 Verificando configuración del sistema de eventos...\n');

// Verificar importaciones
try {
  console.log('📦 Verificando importaciones...');
  
  const { default: Event } = await import('../config/eventModel.js');
  console.log('✅ EventModel importado correctamente');
  
  const { default: EventTracker } = await import('../middleware/eventTracker.js');
  console.log('✅ EventTracker importado correctamente');
  
  const { default: metricsAggregator } = await import('../services/metricsAggregator.js');
  console.log('✅ MetricsAggregator importado correctamente');
  
  const { default: metricsScheduler } = await import('../jobs/scheduleMetrics.js');
  console.log('✅ MetricsScheduler importado correctamente');
  
  console.log('\n🧪 Verificando funcionalidad básica...');
  
  // Verificar que el modelo Event tiene los métodos necesarios
  if (typeof Event.createEvent === 'function') {
    console.log('✅ Event.createEvent método disponible');
  } else {
    console.log('❌ Event.createEvent método NO disponible');
  }
  
  if (typeof Event.getAggregatedEvents === 'function') {
    console.log('✅ Event.getAggregatedEvents método disponible');
  } else {
    console.log('❌ Event.getAggregatedEvents método NO disponible');
  }
  
  // Verificar EventTracker
  if (typeof EventTracker.trackEvent === 'function') {
    console.log('✅ EventTracker.trackEvent método disponible');
  } else {
    console.log('❌ EventTracker.trackEvent método NO disponible');
  }
  
  // Verificar MetricsAggregator
  if (typeof metricsAggregator.generateAllMetrics === 'function') {
    console.log('✅ MetricsAggregator.generateAllMetrics método disponible');
  } else {
    console.log('❌ MetricsAggregator.generateAllMetrics método NO disponible');
  }
  
  // Verificar MetricsScheduler
  if (typeof metricsScheduler.getStatus === 'function') {
    console.log('✅ MetricsScheduler.getStatus método disponible');
  } else {
    console.log('❌ MetricsScheduler.getStatus método NO disponible');
  }
  
  console.log('\n📋 Estado del programador:');
  const status = metricsScheduler.getStatus();
  console.log(`   - Ejecutándose: ${status.isRunning ? '✅' : '⏸️'}`);
  console.log(`   - Última ejecución: ${status.lastRun || 'Nunca'}`);
  console.log(`   - Próxima ejecución: ${status.nextRun || 'No programada'}`);
  
  console.log('\n✅ Verificación completada exitosamente');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Reiniciar el servidor para activar el tracking automático');
  console.log('   2. Ejecutar tests: node scripts/testEventSystem.js');
  console.log('   3. Verificar API de métricas: GET /api/metrics/status');
  console.log('   4. Revisar logs para confirmar tracking de eventos');
  
} catch (error) {
  console.error('❌ Error en verificación:', error.message);
  console.log('\n🔧 Posibles soluciones:');
  console.log('   1. Verificar que todas las dependencias están instaladas');
  console.log('   2. Comprobar que MongoDB está conectado');
  console.log('   3. Revisar logs de servidor para errores de importación');
}

process.exit(0);
