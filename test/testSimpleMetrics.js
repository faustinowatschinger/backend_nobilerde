import mongoose from 'mongoose';
import metricsService from '../services/metricsService.js';

// Configuración de conexión
const MONGODB_URI = 'mongodb://localhost:27017/nobilerde';

async function testSimpleMetrics() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Test 1: Verificar que podemos obtener datos básicos
    console.log('\n🧪 Test 1: Verificar datos básicos...');
    
    const filters = {
      timePeriod: 'dia'
    };

    console.log('📊 Llamando getOverviewData...');
    const overviewData = await metricsService.getOverviewData(filters);
    
    console.log('✅ getOverviewData completado');
    console.log('📈 Datos obtenidos:', {
      usersWithTasting: overviewData.usersWithTasting30d,
      discoveryRate: overviewData.discoveryRate,
      typeBreakdown: overviewData.typeBreakdown?.length || 0,
      topMovers: overviewData.topMovers?.length || 0,
      temporalActivity: overviewData.temporalActivity?.data?.length || 0
    });

    // Test 2: Verificar distribución por tipos
    if (overviewData.typeBreakdown && overviewData.typeBreakdown.length > 0) {
      console.log('\n🏷️ Distribución por tipos:');
      overviewData.typeBreakdown.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.label}: ${item.count} catas (${item.share.toFixed(1)}%)`);
      });
    } else {
      console.log('\n⚠️ No hay datos de distribución por tipos');
    }

    // Test 3: Verificar top movers
    if (overviewData.topMovers && overviewData.topMovers.length > 0) {
      console.log('\n📈 Top movers:');
      overviewData.topMovers.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.label}: ${item.deltaPct > 0 ? '+' : ''}${item.deltaPct}%`);
      });
    } else {
      console.log('\n⚠️ No hay datos de top movers');
    }

    // Test 4: Verificar actividad temporal
    if (overviewData.temporalActivity && overviewData.temporalActivity.data) {
      console.log('\n📊 Actividad temporal:');
      console.log(`  Granularidad: ${overviewData.temporalActivity.granularity}`);
      console.log(`  Períodos: ${overviewData.temporalActivity.data.length}`);
      overviewData.temporalActivity.data.forEach((period, index) => {
        console.log(`    ${index + 1}. ${period.period}: ${period.events} eventos`);
      });
    }

  } catch (error) {
    console.error('❌ Error en test:', error);
  } finally {
    console.log('\n🔌 Cerrando conexión...');
    await mongoose.disconnect();
    console.log('✅ Conexión cerrada');
  }
}

// Ejecutar test
testSimpleMetrics();
