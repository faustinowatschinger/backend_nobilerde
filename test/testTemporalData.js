// backend/test/testTemporalData.js
// Archivo de prueba para verificar la generación de datos temporales

import MetricsService from '../services/metricsService.js';

async function testTemporalData() {
  console.log('🧪 Iniciando pruebas de datos temporales...');
  
  const metricsService = new MetricsService();
  
  // Casos de prueba
  const testCases = [
    {
      name: 'Último mes (por defecto)',
      filters: {},
      expected: 'month'
    },
    {
      name: 'Últimos 3 días',
      filters: { timePeriod: 'dia', timeQuantity: 3 },
      expected: 'hour'
    },
    {
      name: 'Últimas 2 semanas',
      filters: { timePeriod: 'semana', timeQuantity: 2 },
      expected: 'day'
    },
    {
      name: 'Últimos 2 meses',
      filters: { timePeriod: 'mes', timeQuantity: 2 },
      expected: 'week'
    },
    {
      name: 'Último año',
      filters: { timePeriod: 'año', timeQuantity: 1 },
      expected: 'month'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📊 Probando: ${testCase.name}`);
    console.log(`🔧 Filtros:`, testCase.filters);
    
    try {
      const result = await metricsService.getTemporalActivity(
        {}, // userQuery vacío para pruebas
        '2024-01-01', // startDate fijo
        '2024-12-31', // endDate fijo
        testCase.filters.timePeriod,
        testCase.filters.timeQuantity
      );
      
      console.log(`✅ Resultado:`, {
        granularity: result.granularity,
        expected: testCase.expected,
        periods: result.data.length,
        totalEvents: result._meta.totalEvents,
        sampleData: result.data.slice(0, 3) // Primeros 3 períodos
      });
      
      // Verificar que la granularidad sea la esperada
      if (result.granularity === testCase.expected) {
        console.log(`✅ Granularidad correcta: ${result.granularity}`);
      } else {
        console.log(`❌ Granularidad incorrecta: esperaba ${testCase.expected}, obtuve ${result.granularity}`);
      }
      
      // Verificar formato de datos
      if (result.data.length > 0) {
        const firstPeriod = result.data[0];
        console.log(`📅 Primer período:`, {
          period: firstPeriod.period,
          events: firstPeriod.events,
          start: firstPeriod.start,
          end: firstPeriod.end,
          label: firstPeriod.label
        });
        
        // Verificar que el campo 'period' esté presente y sea válido
        if (firstPeriod.period) {
          console.log(`✅ Campo 'period' presente: ${firstPeriod.period}`);
        } else {
          console.log(`❌ Campo 'period' ausente`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error en prueba: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Pruebas completadas');
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
      const periods = metricsService.generateTemporalPeriods(
        '2024-03-01', // startDate
        '2024-03-07', // endDate (una semana)
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
  testTemporalData()
    .then(() => testPeriodGeneration())
    .then(() => {
      console.log('\n🎉 Todas las pruebas completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en las pruebas:', error);
      process.exit(1);
    });
}

export { testTemporalData, testPeriodGeneration };
