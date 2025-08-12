// backend/test/testNewPeriods.js
// Archivo de prueba para verificar los nuevos períodos fijos

import MetricsService from '../services/metricsService.js';

async function testNewPeriods() {
  console.log('🧪 Iniciando pruebas de los nuevos períodos fijos...');
  
  const metricsService = new MetricsService();
  
  // Casos de prueba con los nuevos períodos
  const testCases = [
    {
      name: 'Período Día (24 horas)',
      filters: { timePeriod: 'dia' },
      expected: {
        granularity: 'hour',
        periodLabel: 'Actividad por Hora',
        expectedPeriods: 24
      }
    },
    {
      name: 'Período Semana (7 días)',
      filters: { timePeriod: 'semana' },
      expected: {
        granularity: 'day',
        periodLabel: 'Actividad por Día',
        expectedPeriods: 7
      }
    },
    {
      name: 'Período Mes (4 semanas)',
      filters: { timePeriod: 'mes' },
      expected: {
        granularity: 'week',
        periodLabel: 'Actividad por Semana',
        expectedPeriods: 4
      }
    },
    {
      name: 'Período Año (12 meses)',
      filters: { timePeriod: 'año' },
      expected: {
        granularity: 'month',
        periodLabel: 'Actividad por Mes',
        expectedPeriods: 12
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Probando: ${testCase.name}`);
    console.log(`🔧 Filtros:`, testCase.filters);
    
    try {
      const result = await metricsService.getOverviewData(testCase.filters);
      
      console.log(`✅ Resultado del overview:`, {
        temporalActivity: {
          granularity: result.temporalActivity?.granularity,
          timePeriod: result.temporalActivity?.timePeriod,
          periodLabel: result.temporalActivity?.periodLabel,
          totalPeriods: result.temporalActivity?._meta?.totalPeriods,
          totalEvents: result.temporalActivity?._meta?.totalEvents,
          dateRange: result.temporalActivity?._meta?.dateRange
        },
        sampleData: result.temporalActivity?.data?.slice(0, 3) // Primeros 3 períodos
      });
      
      // Verificar que la granularidad sea la esperada
      if (result.temporalActivity?.granularity === testCase.expected.granularity) {
        console.log(`✅ CORRECTO: Granularidad es ${result.temporalActivity.granularity}`);
      } else {
        console.log(`❌ INCORRECTO: Granularidad es ${result.temporalActivity?.granularity}, debería ser ${testCase.expected.granularity}`);
      }
      
      // Verificar que el label sea el esperado
      if (result.temporalActivity?.periodLabel === testCase.expected.periodLabel) {
        console.log(`✅ CORRECTO: Label es "${result.temporalActivity.periodLabel}"`);
      } else {
        console.log(`❌ INCORRECTO: Label es "${result.temporalActivity?.periodLabel}", debería ser "${testCase.expected.periodLabel}"`);
      }
      
      // Verificar que se generen aproximadamente el número esperado de períodos
      const actualPeriods = result.temporalActivity?.data?.length || 0;
      const expectedPeriods = testCase.expected.expectedPeriods;
      const tolerance = 2; // Permitir variación de ±2 períodos
      
      if (Math.abs(actualPeriods - expectedPeriods) <= tolerance) {
        console.log(`✅ CORRECTO: Se generaron ${actualPeriods} períodos (esperado: ~${expectedPeriods})`);
      } else {
        console.log(`❌ INCORRECTO: Se generaron ${actualPeriods} períodos, pero se esperaban ~${expectedPeriods}`);
      }
      
      // Verificar que las fechas sean consistentes
      if (result.temporalActivity?.data?.length > 0) {
        const firstPeriod = result.temporalActivity.data[0];
        const lastPeriod = result.temporalActivity.data[result.temporalActivity.data.length - 1];
        
        console.log(`📅 Rango de períodos:`, {
          first: {
            period: firstPeriod.period,
            start: firstPeriod.start,
            end: firstPeriod.end,
            label: firstPeriod.label
          },
          last: {
            period: lastPeriod.period,
            start: lastPeriod.start,
            end: lastPeriod.end,
            label: lastPeriod.label
          }
        });
      }
      
    } catch (error) {
      console.error(`❌ Error en prueba: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Pruebas de nuevos períodos completadas');
}

// Función para probar la generación de períodos específicos
async function testPeriodGeneration() {
  console.log('\n🔧 Probando generación de períodos específicos...');
  
  const metricsService = new MetricsService();
  
  // Probar diferentes granularidades
  const granularities = ['hour', 'day', 'week', 'month'];
  
  for (const granularity of granularities) {
    console.log(`\n📊 Probando granularidad: ${granularity}`);
    
    try {
      let startDate, endDate;
      
      switch (granularity) {
        case 'hour':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 horas atrás
          endDate = new Date();
          break;
        case 'day':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días atrás
          endDate = new Date();
          break;
        case 'week':
          startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000); // 28 días atrás
          endDate = new Date();
          break;
        case 'month':
          startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 año atrás
          endDate = new Date();
          break;
      }
      
      const periods = metricsService.generateTemporalPeriods(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        granularity
      );
      
      console.log(`✅ Períodos generados: ${periods.length}`);
      
      if (periods.length > 0) {
        const samplePeriod = periods[0];
        console.log(`📅 Período de ejemplo:`, {
          period: samplePeriod.period,
          label: samplePeriod.label,
          start: samplePeriod.start.toISOString(),
          end: samplePeriod.end.toISOString()
        });
      }
      
    } catch (error) {
      console.error(`❌ Error generando períodos para ${granularity}: ${error.message}`);
    }
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testNewPeriods()
    .then(() => testPeriodGeneration())
    .then(() => {
      console.log('\n🎉 Todas las pruebas de nuevos períodos completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en las pruebas de nuevos períodos:', error);
      process.exit(1);
    });
}

export { testNewPeriods, testPeriodGeneration };
