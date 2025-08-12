// Test para verificar que las nuevas funciones de métricas reales funcionen correctamente
import mongoose from 'mongoose';
import { MetricsService } from '../services/metricsService.js';

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

async function testMetricsRealData() {
  console.log('🧪 Probando funciones de métricas con datos reales...\n');

  try {
    const metricsService = new MetricsService();
    
    // Configurar fechas de prueba
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); // 7 días atrás
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Hoy
    
    console.log('📅 Fechas de prueba:');
    console.log(`  - Inicio: ${startDate.toISOString()}`);
    console.log(`  - Fin: ${endDate.toISOString()}`);

    // 1. Probar getTypeBreakdown
    console.log('\n🔍 1. PROBANDO getTypeBreakdown');
    console.log('=' .repeat(50));
    
    const typeBreakdown = await metricsService.getTypeBreakdown({}, {}, startDate, endDate);
    console.log('✅ getTypeBreakdown completado');
    console.log('📊 Resultado:', typeBreakdown);

    // 2. Probar getTopMovers
    console.log('\n🔍 2. PROBANDO getTopMovers');
    console.log('=' .repeat(50));
    
    const topMovers = await metricsService.getTopMovers({}, {}, startDate, endDate);
    console.log('✅ getTopMovers completado');
    console.log('📊 Resultado:', topMovers);

    // 3. Probar getOverviewData completo
    console.log('\n🔍 3. PROBANDO getOverviewData COMPLETO');
    console.log('=' .repeat(50));
    
    const overviewData = await metricsService.getOverviewData({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timePeriod: 'semana'
    });
    
    console.log('✅ getOverviewData completado');
    console.log('📊 Estructura de respuesta:');
    console.log('  - usersWithTasting30d:', overviewData.usersWithTasting30d);
    console.log('  - discoveryRate:', overviewData.discoveryRate);
    console.log('  - typeBreakdown:', overviewData.typeBreakdown?.length || 0, 'tipos');
    console.log('  - topMovers:', overviewData.topMovers?.length || 0, 'yerbas');
    console.log('  - temporalActivity:', overviewData.temporalActivity?.data?.length || 0, 'períodos');

    // 4. Análisis de resultados
    console.log('\n📈 4. ANÁLISIS DE RESULTADOS');
    console.log('=' .repeat(50));
    
    if (typeBreakdown.length === 0) {
      console.log('⚠️ getTypeBreakdown no devolvió datos');
      console.log('💡 Posibles causas:');
      console.log('   - No hay yerbas con tipos definidos');
      console.log('   - No hay usuarios con yerbas marcadas como "probada"');
      console.log('   - Los filtros de fecha son muy restrictivos');
    } else {
      console.log('✅ getTypeBreakdown funcionando correctamente');
      console.log(`   - ${typeBreakdown.length} tipos de yerba encontrados`);
      console.log(`   - Total de catas: ${typeBreakdown.reduce((sum, item) => sum + item.count, 0)}`);
    }
    
    if (topMovers.length === 0) {
      console.log('⚠️ getTopMovers no devolvió datos');
      console.log('💡 Posibles causas:');
      console.log('   - No hay suficientes datos para comparar períodos');
      console.log('   - Los filtros de fecha son muy restrictivos');
      console.log('   - No hay cambios significativos en popularidad');
    } else {
      console.log('✅ getTopMovers funcionando correctamente');
      console.log(`   - ${topMovers.length} yerbas con cambios de popularidad`);
      console.log(`   - Mayor cambio: ${topMovers[0]?.deltaPct}%`);
    }

    // 5. Verificar que no hay datos simulados
    console.log('\n🔍 5. VERIFICANDO AUSENCIA DE DATOS SIMULADOS');
    console.log('=' .repeat(50));
    
    const hasSimulatedData = topMovers.some(item => 
      typeof item.deltaPct === 'number' && 
      item.deltaPct >= -10 && 
      item.deltaPct <= 10 &&
      item.deltaPct % 0.1 === 0 // Los datos simulados eran múltiplos de 0.1
    );
    
    if (hasSimulatedData) {
      console.log('⚠️ Se detectaron posibles datos simulados');
    } else {
      console.log('✅ No se detectaron datos simulados');
    }

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
  }
}

// Ejecutar test
async function main() {
  await connectDB();
  await testMetricsRealData();
  await disconnectDB();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testMetricsRealData };
