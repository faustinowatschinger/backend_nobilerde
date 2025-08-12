// backend/test/testDiaPeriod.js
// Archivo de prueba específico para verificar el período 'dia'

import MetricsService from '../services/metricsService.js';

async function testDiaPeriod() {
  console.log('🧪 Iniciando pruebas específicas para período "dia"...');
  
  const metricsService = new MetricsService();
  
  // Caso específico: período "dia"
  const testCase = {
    name: 'Período Día',
    filters: { 
      timePeriod: 'dia', 
      timeQuantity: 1 
    }
  };
  
  console.log(`📊 Probando: ${testCase.name}`);
  console.log(`🔧 Filtros:`, testCase.filters);
  
  try {
    const result = await metricsService.getOverviewData(testCase.filters);
    
    console.log(`✅ Resultado del overview:`, {
      temporalActivity: {
        granularity: result.temporalActivity?.granularity,
        timePeriod: result.temporalActivity?.timePeriod,
        timeQuantity: result.temporalActivity?.timeQuantity,
        totalPeriods: result.temporalActivity?._meta?.totalPeriods,
        totalEvents: result.temporalActivity?._meta?.totalEvents,
        dateRange: result.temporalActivity?._meta?.dateRange
      },
      sampleData: result.temporalActivity?.data?.slice(0, 3) // Primeros 3 períodos
    });
    
    // Verificar que solo se genere un período para el día
    if (result.temporalActivity?.data?.length === 1) {
      console.log(`✅ CORRECTO: Solo se generó 1 período para el día`);
    } else {
      console.log(`❌ INCORRECTO: Se generaron ${result.temporalActivity?.data?.length} períodos en lugar de 1`);
    }
    
    // Verificar que la granularidad sea 'day'
    if (result.temporalActivity?.granularity === 'day') {
      console.log(`✅ CORRECTO: Granularidad es 'day'`);
    } else {
      console.log(`❌ INCORRECTO: Granularidad es ${result.temporalActivity?.granularity}, debería ser 'day'`);
    }
    
    // Verificar que las fechas sean del mismo día
    if (result.temporalActivity?.data?.length > 0) {
      const firstPeriod = result.temporalActivity.data[0];
      const startDate = new Date(firstPeriod.start);
      const endDate = new Date(firstPeriod.end);
      
      if (startDate.toDateString() === endDate.toDateString()) {
        console.log(`✅ CORRECTO: Las fechas del período son del mismo día`);
      } else {
        console.log(`❌ INCORRECTO: Las fechas del período son de días diferentes`);
        console.log(`   Start: ${startDate.toDateString()}`);
        console.log(`   End: ${endDate.toDateString()}`);
      }
      
      console.log(`📅 Período generado:`, {
        period: firstPeriod.period,
        events: firstPeriod.events,
        start: firstPeriod.start,
        end: firstPeriod.end,
        label: firstPeriod.label,
        debug: firstPeriod._debug
      });
    }
    
  } catch (error) {
    console.error(`❌ Error en prueba: ${error.message}`);
  }
  
  console.log('\n🎯 Prueba de período "dia" completada');
}

// Función para probar la generación de períodos específicamente para 'day'
async function testDayGranularity() {
  console.log('\n🔧 Probando generación de períodos con granularidad "day"...');
  
  const metricsService = new MetricsService();
  
  // Probar con fechas del mismo día
  const sameDayStart = '2024-03-15';
  const sameDayEnd = '2024-03-15';
  
  try {
    const periods = metricsService.generateTemporalPeriods(sameDayStart, sameDayEnd, 'day');
    
    console.log(`✅ Períodos generados para mismo día: ${periods.length}`);
    
    if (periods.length === 1) {
      console.log(`✅ CORRECTO: Solo se generó 1 período para el mismo día`);
      const period = periods[0];
      console.log(`📅 Período:`, {
        period: period.period,
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        debug: period._debug
      });
    } else {
      console.log(`❌ INCORRECTO: Se generaron ${periods.length} períodos para el mismo día`);
    }
    
  } catch (error) {
    console.error(`❌ Error generando períodos para granularidad 'day': ${error.message}`);
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testDiaPeriod()
    .then(() => testDayGranularity())
    .then(() => {
      console.log('\n🎉 Todas las pruebas del período "dia" completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en las pruebas del período "dia":', error);
      process.exit(1);
    });
}

export { testDiaPeriod, testDayGranularity };
