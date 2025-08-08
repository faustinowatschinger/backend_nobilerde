// backend/scripts/exampleUsage.js
/**
 * Ejemplo completo de uso del sistema de eventos y métricas
 * Demuestra todas las funcionalidades principales
 */

import Event from '../config/eventModel.js';
import EventTracker from '../middleware/eventTracker.js';
import metricsAggregator from '../services/metricsAggregator.js';
import { usersConn, yerbasConn } from '../config/multiDB.js';

async function exampleUsage() {
  console.log('🚀 Ejemplo de uso del sistema de eventos y métricas\n');

  try {
    // 1. Obtener usuarios y yerbas de ejemplo
    const User = usersConn.model('User');
    const Yerba = yerbasConn.model('Yerba');
    
    const sampleUser = await User.findOne().lean();
    const sampleYerba = await Yerba.findOne().lean();
    
    if (!sampleUser || !sampleYerba) {
      console.log('❌ Se necesitan al menos un usuario y una yerba en la BD para el ejemplo');
      return;
    }
    
    console.log(`📱 Usuario de ejemplo: ${sampleUser.username}`);
    console.log(`🧉 Yerba de ejemplo: ${sampleYerba.nombre}\n`);

    // 2. Ejemplos de tracking de eventos
    console.log('📊 TRACKING DE EVENTOS\n');
    
    // Simular búsqueda
    await EventTracker.trackSearch(sampleUser._id, 'yerba suave argentina', ['tipo:tradicional', 'pais:Argentina'], 15);
    console.log('✅ Evento de búsqueda registrado');
    
    // Simular vista de yerba
    await EventTracker.trackEvent(sampleUser._id, 'view_yerba', {
      yerba: sampleYerba._id,
      sessionId: 'example-session-123'
    });
    console.log('✅ Evento de vista de yerba registrado');
    
    // Simular rating
    await EventTracker.trackRating(sampleUser._id, sampleYerba._id, 4, ['suave', 'herbal'], 'Muy buena yerba');
    console.log('✅ Evento de rating registrado');
    
    // Simular interacción con IA
    await EventTracker.trackAIInteraction(
      sampleUser._id, 
      'Busco una yerba suave para la mañana',
      { tipo: 'Suave', containsPalo: 'No', pais: 'Argentina' },
      5
    );
    console.log('✅ Evento de IA registrado\n');

    // 3. Mostrar eventos recientes del usuario
    console.log('📝 EVENTOS RECIENTES DEL USUARIO\n');
    const recentEvents = await EventTracker.getUserRecentEvents(sampleUser._id, 5);
    recentEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.type} - ${event.timestamp.toISOString()}`);
      if (event.searchQuery) console.log(`   Query: "${event.searchQuery}"`);
      if (event.score) console.log(`   Score: ${event.score}/5`);
      if (event.notes?.length) console.log(`   Notas: ${event.notes.join(', ')}`);
    });

    // 4. Estadísticas básicas de eventos
    console.log('\n📈 ESTADÍSTICAS DE EVENTOS\n');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const eventStats = await EventTracker.getEventStats(thirtyDaysAgo, new Date());
    console.log('Eventos de los últimos 30 días:');
    eventStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} eventos, ${stat.uniqueUserCount} usuarios únicos`);
    });

    // 5. Generar métricas de ejemplo
    console.log('\n🔄 GENERANDO MÉTRICAS AGREGADAS\n');
    console.log('Esto puede tomar unos segundos...');
    
    const startTime = Date.now();
    await metricsAggregator.generateAllMetrics();
    const duration = Date.now() - startTime;
    
    console.log(`✅ Métricas generadas en ${duration}ms\n`);

    // 6. Mostrar ejemplos de métricas generadas
    console.log('📊 EJEMPLOS DE MÉTRICAS GENERADAS\n');
    
    // Top yerbas
    const topYerbas = await metricsAggregator.getMetrics('metrics_top_yerbas', {}, 3);
    console.log('🏆 Top Yerbas:');
    topYerbas.forEach((metric, index) => {
      console.log(`  ${index + 1}. ${metric._id.yerbaNombre} (${metric._id.yerbaMarca})`);
      console.log(`     Interacciones: ${metric.totalInteractions}, Usuarios únicos: ${metric.uniqueUserCount}`);
      if (metric.avgScore) console.log(`     Score promedio: ${metric.avgScore.toFixed(1)}/5`);
    });

    // Notas de sabor
    const flavorNotes = await metricsAggregator.getMetrics('metrics_flavor_notes', {}, 5);
    console.log('\n🍃 Notas de Sabor Más Frecuentes:');
    flavorNotes.forEach((metric, index) => {
      console.log(`  ${index + 1}. "${metric._id.note}" - ${metric.count} menciones`);
      console.log(`     País: ${metric._id.country || 'N/A'}, Edad: ${metric._id.ageBucket || 'N/A'}`);
    });

    // Comportamiento de usuarios
    const userBehavior = await metricsAggregator.getMetrics('metrics_user_behavior', {}, 5);
    console.log('\n👥 Comportamiento de Usuarios:');
    userBehavior.forEach((metric, index) => {
      console.log(`  ${index + 1}. ${metric._id.eventType} - ${metric.eventCount} eventos`);
      console.log(`     Fecha: ${metric._id.day}, Usuarios únicos: ${metric.uniqueUserCount}`);
    });

    // 7. Ejemplo de consulta de métricas con filtros
    console.log('\n🔍 CONSULTAS CON FILTROS\n');
    
    // Buscar métricas de Argentina
    const argentinaMetrics = await metricsAggregator.getMetrics('metrics_top_yerbas', { '_id.country': 'Argentina' }, 2);
    console.log(`🇦🇷 Métricas de Argentina: ${argentinaMetrics.length} resultados`);
    
    // Buscar notas de sabor de usuarios jóvenes
    const youngUserNotes = await metricsAggregator.getMetrics('metrics_flavor_notes', { '_id.ageBucket': '18-24' }, 3);
    console.log(`👨‍💼 Notas de usuarios 18-24: ${youngUserNotes.length} resultados`);

    // 8. Demostrar k-anonimato
    console.log('\n🔒 VERIFICACIÓN DE K-ANONIMATO\n');
    
    const allTopYerbas = await metricsAggregator.getMetrics('metrics_top_yerbas', {}, 50);
    const minThreshold = 50;
    const violations = allTopYerbas.filter(m => m.uniqueUserCount && m.uniqueUserCount < minThreshold);
    
    console.log(`📊 Total de métricas de top yerbas: ${allTopYerbas.length}`);
    console.log(`🔒 Violaciones de k-anonimato (threshold ${minThreshold}): ${violations.length}`);
    console.log(`✅ Cumplimiento de privacidad: ${violations.length === 0 ? 'EXCELENTE' : 'REVISAR'}`);

    // 9. Información del sistema
    console.log('\n🖥️ INFORMACIÓN DEL SISTEMA\n');
    
    const totalEvents = await Event.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalYerbas = await Yerba.countDocuments();
    
    console.log(`📊 Total de eventos: ${totalEvents}`);
    console.log(`👥 Total de usuarios: ${totalUsers}`);
    console.log(`🧉 Total de yerbas: ${totalYerbas}`);
    
    // Eventos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = await Event.countDocuments({ timestamp: { $gte: today } });
    console.log(`📅 Eventos de hoy: ${todayEvents}`);
    
    console.log('\n✨ EJEMPLO COMPLETADO EXITOSAMENTE ✨');
    console.log('\n📋 RESUMEN DE FUNCIONALIDADES DEMOSTRADAS:');
    console.log('   ✅ Tracking automático de eventos');
    console.log('   ✅ Generación de métricas agregadas');
    console.log('   ✅ Consultas con filtros');
    console.log('   ✅ Verificación de k-anonimato');
    console.log('   ✅ Estadísticas en tiempo real');
    console.log('\n🔗 APIs disponibles en /api/metrics/');
    console.log('   - GET /api/metrics/top-yerbas');
    console.log('   - GET /api/metrics/flavor-notes');
    console.log('   - GET /api/metrics/trends');
    console.log('   - GET /api/metrics/user-behavior');
    console.log('   - GET /api/metrics/discovery');
    console.log('   - GET /api/metrics/summary');
    console.log('   - GET /api/metrics/status');

  } catch (error) {
    console.error('❌ Error en ejemplo:', error);
  } finally {
    // Cerrar conexiones
    await usersConn.close();
    await yerbasConn.close();
    process.exit(0);
  }
}

// Ejecutar ejemplo si el script se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage();
}

export default exampleUsage;
