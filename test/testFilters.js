import mongoose from 'mongoose';
import metricsService from '../services/metricsService.js';

// Configuración de conexión
const MONGODB_URI = 'mongodb://localhost:27017/nobilerde';

async function testFilters() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // Test 1: Verificar filtro por día
    console.log('\n🧪 Test 1: Filtro por día...');
    
    const filtersDia = {
      timePeriod: 'dia'
    };

    console.log('📊 Llamando getOverviewData con timePeriod: dia...');
    const dataDia = await metricsService.getOverviewData(filtersDia);
    
    console.log('✅ getOverviewData completado para día');
    console.log('📈 Datos obtenidos para día:', {
      temporalActivity: {
        granularity: dataDia.temporalActivity?.granularity,
        periodLabel: dataDia.temporalActivity?.periodLabel,
        dataLength: dataDia.temporalActivity?.data?.length,
        sampleData: dataDia.temporalActivity?.data?.slice(0, 3)
      }
    });

    // Test 2: Verificar filtro por semana
    console.log('\n🧪 Test 2: Filtro por semana...');
    
    const filtersSemana = {
      timePeriod: 'semana'
    };

    console.log('📊 Llamando getOverviewData con timePeriod: semana...');
    const dataSemana = await metricsService.getOverviewData(filtersSemana);
    
    console.log('✅ getOverviewData completado para semana');
    console.log('📈 Datos obtenidos para semana:', {
      temporalActivity: {
        granularity: dataSemana.temporalActivity?.granularity,
        periodLabel: dataSemana.temporalActivity?.periodLabel,
        dataLength: dataSemana.temporalActivity?.data?.length,
        sampleData: dataSemana.temporalActivity?.data?.slice(0, 3)
      }
    });

    // Test 3: Verificar filtro por mes
    console.log('\n🧪 Test 3: Filtro por mes...');
    
    const filtersMes = {
      timePeriod: 'mes'
    };

    console.log('📊 Llamando getOverviewData con timePeriod: mes...');
    const dataMes = await metricsService.getOverviewData(filtersMes);
    
    console.log('✅ getOverviewData completado para mes');
    console.log('📈 Datos obtenidos para mes:', {
      temporalActivity: {
        granularity: dataMes.temporalActivity?.granularity,
        periodLabel: dataMes.temporalActivity?.periodLabel,
        dataLength: dataMes.temporalActivity?.data?.length,
        sampleData: dataMes.temporalActivity?.data?.slice(0, 3)
      }
    });

    // Test 4: Verificar que los datos sean diferentes entre períodos
    console.log('\n🧪 Test 4: Verificar diferencias entre períodos...');
    
    const diaDataLength = dataDia.temporalActivity?.data?.length || 0;
    const semanaDataLength = dataSemana.temporalActivity?.data?.length || 0;
    const mesDataLength = dataMes.temporalActivity?.data?.length || 0;
    
    console.log('📊 Comparación de longitudes de datos:');
    console.log(`   - Día: ${diaDataLength} períodos`);
    console.log(`   - Semana: ${semanaDataLength} períodos`);
    console.log(`   - Mes: ${mesDataLength} períodos`);
    
    if (diaDataLength !== semanaDataLength || semanaDataLength !== mesDataLength) {
      console.log('✅ Los períodos tienen diferentes cantidades de datos (correcto)');
    } else {
      console.log('❌ Los períodos tienen la misma cantidad de datos (incorrecto)');
    }

  } catch (error) {
    console.error('❌ Error en testFilters:', error);
  } finally {
    console.log('🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB');
  }
}

testFilters();
