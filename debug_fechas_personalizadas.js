import mongoose from 'mongoose';
import metricsService from './services/metricsService.js';

async function debugFechasPersonalizadas() {
  try {
    console.log('🔍 Debug de fechas personalizadas...');
    
    // Fechas personalizadas para prueba (ej: últimos 3 días)
    const hoy = new Date();
    const hace3Dias = new Date(hoy.getTime() - 3 * 24 * 60 * 60 * 1000);
    
    const fechasPersonalizadas = {
      startDate: hace3Dias.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: hoy.toISOString().split('T')[0]
    };
    
    console.log('📅 Fechas personalizadas de prueba:', fechasPersonalizadas);
    
    // 1. Test con período 'dia' normal
    console.log('\n🔍 Test 1: Período "dia" normal...');
    const dataDia = await metricsService.getOverviewData({
      timePeriod: 'dia'
    });
    
    console.log('📊 Resultado período dia:', {
      activeUsers: dataDia.activeUsers,
      totalEvents: dataDia.sample?.nEvents,
      topMovers: dataDia.topMovers?.length
    });
    
    // 2. Test con fechas personalizadas (últimos 3 días)
    console.log('\n🔍 Test 2: Fechas personalizadas (últimos 3 días)...');
    const dataPersonalizada = await metricsService.getOverviewData({
      ...fechasPersonalizadas,
      timePeriod: 'custom' // o cualquier valor, debería usar las fechas
    });
    
    console.log('📊 Resultado fechas personalizadas:', {
      activeUsers: dataPersonalizada.activeUsers,
      totalEvents: dataPersonalizada.sample?.nEvents,
      topMovers: dataPersonalizada.topMovers?.length
    });
    
    // 3. Test específico de usuarios activos
    console.log('\n🔍 Test 3: Verificando usuarios activos...');
    
    // Crear fechas para test
    const startTest = new Date(fechasPersonalizadas.startDate + 'T00:00:00.000Z');
    const endTest = new Date(fechasPersonalizadas.endDate + 'T23:59:59.999Z');
    
    console.log('📅 Período de test:', {
      start: startTest.toISOString(),
      end: endTest.toISOString()
    });
    
    const sampleInfo = await metricsService.getSampleInfo({}, startTest, endTest);
    console.log('📊 Sample info:', sampleInfo);
    
    // 4. Test de TopMovers
    console.log('\n🔍 Test 4: Verificando TopMovers...');
    const topMovers = await metricsService.getTopMovers({}, {}, startTest, endTest);
    console.log('📊 TopMovers:', topMovers.length, 'encontrados');
    
    if (topMovers.length > 0) {
      topMovers.slice(0, 3).forEach((mover, index) => {
        console.log(`  ${index + 1}. ${mover.label}: ${mover.deltaPct}% (${mover.changeType})`);
      });
    }
    
    // 5. Test de actividad temporal
    console.log('\n🔍 Test 5: Verificando actividad temporal...');
    const temporalActivity = await metricsService.getTemporalActivity({}, {}, startTest, endTest, 'custom');
    console.log('📊 Actividad temporal:', {
      granularity: temporalActivity.granularity,
      totalPeriods: temporalActivity.data?.length,
      totalEvents: temporalActivity._meta?.totalEvents
    });
    
    // 6. Comparar con período equivalente usando timePeriod
    console.log('\n🔍 Test 6: Comparando con período "semana"...');
    const dataSemana = await metricsService.getOverviewData({
      timePeriod: 'semana'
    });
    
    console.log('📊 Comparación:');
    console.log('  Fechas personalizadas (3 días):', {
      activeUsers: dataPersonalizada.activeUsers,
      totalEvents: dataPersonalizada.sample?.nEvents
    });
    console.log('  Período semana (7 días):', {
      activeUsers: dataSemana.activeUsers,
      totalEvents: dataSemana.sample?.nEvents
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugFechasPersonalizadas();
