// backend/test/testDiaPeriodFixed.js
// Archivo de prueba para verificar que el período 'dia' incluya el día completo de hoy

import MetricsService from '../services/metricsService.js';

async function testDiaPeriodFixed() {
  console.log('🧪 Iniciando pruebas del período "dia" corregido...');
  
  const metricsService = new MetricsService();
  
  // Caso específico: período "dia"
  const testCase = {
    name: 'Período Día (Día completo de hoy)',
    filters: { 
      timePeriod: 'dia'
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
        periodLabel: result.temporalActivity?.periodLabel,
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
    
    // Verificar que el label sea correcto
    if (result.temporalActivity?.periodLabel === 'Actividad por Día') {
      console.log(`✅ CORRECTO: Label es "${result.temporalActivity.periodLabel}"`);
    } else {
      console.log(`❌ INCORRECTO: Label es "${result.temporalActivity?.periodLabel}", debería ser "Actividad por Día"`);
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
      
      // Verificar que la fecha sea de hoy
      const today = new Date();
      const periodDate = new Date(firstPeriod.start);
      
      if (periodDate.toDateString() === today.toDateString()) {
        console.log(`✅ CORRECTO: El período es del día de hoy (${periodDate.toDateString()})`);
      } else {
        console.log(`❌ INCORRECTO: El período no es del día de hoy`);
        console.log(`   Período: ${periodDate.toDateString()}`);
        console.log(`   Hoy: ${today.toDateString()}`);
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
  
  console.log('\n🎯 Prueba del período "dia" corregido completada');
}

// Función para probar la generación de períodos específicamente para 'day'
async function testDayGranularityFixed() {
  console.log('\n🔧 Probando generación de períodos con granularidad "day" corregida...');
  
  const metricsService = new MetricsService();
  
  // Probar con fechas del mismo día (hoy)
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  try {
    const periods = metricsService.generateTemporalPeriods(todayString, todayString, 'day');
    
    console.log(`✅ Períodos generados para hoy: ${periods.length}`);
    
    if (periods.length === 1) {
      console.log(`✅ CORRECTO: Solo se generó 1 período para hoy`);
      const period = periods[0];
      console.log(`📅 Período:`, {
        period: period.period,
        label: period.label,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
        debug: period._debug
      });
      
      // Verificar que la fecha sea de hoy
      const periodDate = new Date(period.start);
      if (periodDate.toDateString() === today.toDateString()) {
        console.log(`✅ CORRECTO: El período es del día de hoy`);
      } else {
        console.log(`❌ INCORRECTO: El período no es del día de hoy`);
      }
    } else {
      console.log(`❌ INCORRECTO: Se generaron ${periods.length} períodos para hoy`);
    }
    
  } catch (error) {
    console.error(`❌ Error generando períodos para granularidad 'day': ${error.message}`);
  }
}

// Ejecutar pruebas si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testDiaPeriodFixed()
    .then(() => testDayGranularityFixed())
    .then(() => {
      console.log('\n🎉 Todas las pruebas del período "dia" corregido completadas');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Error en las pruebas del período "dia" corregido:', error);
      process.exit(1);
    });
}

export { testDiaPeriodFixed, testDayGranularityFixed };
