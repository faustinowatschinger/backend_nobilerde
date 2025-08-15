// debug_type_breakdown.js
// Script para probar la funcionalidad de distribución por tipos

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testTypeBreakdown() {
  console.log('🧪 DEBUG - DISTRIBUCIÓN POR TIPOS DE YERBA');
  console.log('=' .repeat(60));
  
  const testCases = [
    {
      name: 'Hoy',
      params: {
        timePeriod: 'dia',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    },
    {
      name: 'Últimos 7 días',
      params: {
        timePeriod: 'semana',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    },
    {
      name: 'Últimos 30 días',
      params: {
        timePeriod: 'mes',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    },
    {
      name: 'Fechas personalizadas (15 días)',
      params: {
        useCustomDates: true,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 Probando: ${testCase.name}`);
    console.log('📅 Parámetros:', testCase.params);
    
    try {
      const url = `${BASE_URL}/api/dashboard/overview`;
      const response = await axios.get(url, { params: testCase.params });
      
      if (response.data && response.data.typeBreakdown) {
        const typeBreakdown = response.data.typeBreakdown;
        
        console.log(`📊 Resultados (${typeBreakdown.length} tipos):`);
        
        if (typeBreakdown.length === 0) {
          console.log('   ⚠️  No hay datos para este período');
        } else {
          typeBreakdown.forEach((type, index) => {
            const isHistorical = type.note ? ' (histórico)' : '';
            console.log(`   ${index + 1}. ${type.label}: ${type.count} catas (${type.share.toFixed(1)}%)${isHistorical}`);
          });
          
          // Verificar si todos los elementos tienen note (datos históricos)
          const allHistorical = typeBreakdown.every(type => type.note);
          if (allHistorical) {
            console.log('   🔄 Todos los datos son históricos');
          } else {
            console.log('   ✅ Datos del período actual');
          }
        }
      } else {
        console.log('   ❌ No se recibió typeBreakdown en la respuesta');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.log(`   📄 Status: ${error.response.status}`);
        console.log(`   📝 Respuesta: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ANÁLISIS COMPLETO');
  console.log('=' .repeat(60));
  console.log('Si los datos son diferentes entre períodos:');
  console.log('✅ El gráfico debería actualizarse correctamente');
  console.log('');
  console.log('Si todos los períodos muestran los mismos datos históricos:');
  console.log('❌ Hay un problema con la lógica del backend');
  console.log('');
  console.log('🎯 EXPECTATIVA: Cada período debería mostrar datos diferentes');
  console.log('   - Períodos cortos (hoy, 7 días): Pocos datos o datos específicos');
  console.log('   - Períodos largos (30 días): Más datos acumulados');
  console.log('   - Los porcentajes deberían cambiar según el período');
}

// Función adicional para probar un rango específico
async function testSpecificRange(startDate, endDate) {
  console.log(`\n🔍 PRUEBA ESPECÍFICA: ${startDate} a ${endDate}`);
  
  try {
    const url = `${BASE_URL}/api/dashboard/overview`;
    const response = await axios.get(url, { 
      params: { 
        startDate, 
        endDate,
        useCustomDates: true
      } 
    });
    
    if (response.data && response.data.typeBreakdown) {
      const typeBreakdown = response.data.typeBreakdown;
      
      console.log(`📊 Resultados para el rango específico:`);
      if (typeBreakdown.length === 0) {
        console.log('   ⚠️  No hay datos en este rango');
      } else {
        typeBreakdown.forEach((type, index) => {
          console.log(`   ${index + 1}. ${type.label}: ${type.count} catas (${type.share.toFixed(1)}%)`);
          if (type.note) {
            console.log(`      📝 Nota: ${type.note}`);
          }
        });
      }
    }
    
    return response.data.typeBreakdown;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Función para comparar dos rangos
async function compareRanges() {
  console.log('\n🔍 COMPARACIÓN DE RANGOS');
  console.log('=' .repeat(40));
  
  // Rango 1: Últimos 7 días
  const end = new Date();
  const start7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const range7 = await testSpecificRange(
    start7.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  );
  
  // Rango 2: Últimos 30 días
  const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const range30 = await testSpecificRange(
    start30.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  );
  
  // Comparar resultados
  if (range7 && range30) {
    console.log('\n📈 COMPARACIÓN:');
    
    const total7 = range7.reduce((sum, type) => sum + type.count, 0);
    const total30 = range30.reduce((sum, type) => sum + type.count, 0);
    
    console.log(`   7 días: ${total7} catas totales`);
    console.log(`   30 días: ${total30} catas totales`);
    
    if (total30 >= total7) {
      console.log('   ✅ Lógico: 30 días tiene igual o más datos que 7 días');
    } else {
      console.log('   ⚠️  Extraño: 30 días tiene menos datos que 7 días');
    }
    
    // Verificar si los datos son idénticos (problema)
    const identical = JSON.stringify(range7) === JSON.stringify(range30);
    if (identical) {
      console.log('   ❌ PROBLEMA: Los datos son idénticos entre períodos');
    } else {
      console.log('   ✅ CORRECTO: Los datos difieren entre períodos');
    }
  }
}

if (require.main === module) {
  testTypeBreakdown()
    .then(() => compareRanges())
    .catch(error => {
      console.error('Error en el test:', error);
    });
}

module.exports = { testTypeBreakdown, testSpecificRange, compareRanges };
