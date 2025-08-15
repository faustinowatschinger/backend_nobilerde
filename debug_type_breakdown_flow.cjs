// Debug script para verificar el flujo completo de typeBreakdown
const http = require('http');

const baseURL = 'http://localhost:3000';

async function makeRequest(url, params = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url, baseURL);
    
    // Agregar parámetros de query
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        urlObj.searchParams.append(key, params[key]);
      }
    });

    console.log(`🌐 Haciendo request a: ${urlObj.toString()}`);

    const req = http.get(urlObj.toString(), (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Error parsing JSON: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testTypeBreakdownFlow() {
  console.log('🔬 === TESTING TYPE BREAKDOWN FLOW ===\n');

  // Test 1: Período "últimos 7 días"
  console.log('📅 Test 1: Últimos 7 días');
  try {
    const response1 = await makeRequest('/api/dashboard/overview', {
      timePeriod: '7d'
    });
    
    console.log('✅ Respuesta exitosa para últimos 7 días');
    console.log('📊 TypeBreakdown length:', response1.typeBreakdown?.length || 0);
    console.log('📊 TypeBreakdown data:');
    response1.typeBreakdown?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.label}: ${item.count} catas (${item.share?.toFixed(1)}%) ${item.note ? '[' + item.note + ']' : ''}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error en test 1:', error.message);
  }

  // Test 2: Período "últimos 30 días"
  console.log('📅 Test 2: Últimos 30 días');
  try {
    const response2 = await makeRequest('/api/dashboard/overview', {
      timePeriod: '30d'
    });
    
    console.log('✅ Respuesta exitosa para últimos 30 días');
    console.log('📊 TypeBreakdown length:', response2.typeBreakdown?.length || 0);
    console.log('📊 TypeBreakdown data:');
    response2.typeBreakdown?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.label}: ${item.count} catas (${item.share?.toFixed(1)}%) ${item.note ? '[' + item.note + ']' : ''}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error en test 2:', error.message);
  }

  // Test 3: Fechas personalizadas - Rango muy reciente (últimos 2 días)
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
  const startRecent = twoDaysAgo.toISOString().split('T')[0];
  const endRecent = now.toISOString().split('T')[0];
  
  console.log(`📅 Test 3: Fechas personalizadas - Últimos 2 días (${startRecent} a ${endRecent})`);
  try {
    const response3 = await makeRequest('/api/dashboard/overview', {
      useCustomDates: 'true',
      startDate: startRecent,
      endDate: endRecent
    });
    
    console.log('✅ Respuesta exitosa para fechas personalizadas (últimos 2 días)');
    console.log('📊 TypeBreakdown length:', response3.typeBreakdown?.length || 0);
    console.log('📊 TypeBreakdown data:');
    response3.typeBreakdown?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.label}: ${item.count} catas (${item.share?.toFixed(1)}%) ${item.note ? '[' + item.note + ']' : ''}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error en test 3:', error.message);
  }

  // Test 4: Fechas personalizadas - Rango histórico (hace 3 meses)
  const fourMonthsAgo = new Date(now.getTime() - (4 * 30 * 24 * 60 * 60 * 1000));
  const threeMonthsAgo = new Date(now.getTime() - (3 * 30 * 24 * 60 * 60 * 1000));
  const startOld = fourMonthsAgo.toISOString().split('T')[0];
  const endOld = threeMonthsAgo.toISOString().split('T')[0];
  
  console.log(`📅 Test 4: Fechas personalizadas - Hace 3 meses (${startOld} a ${endOld})`);
  try {
    const response4 = await makeRequest('/api/dashboard/overview', {
      useCustomDates: 'true',
      startDate: startOld,
      endDate: endOld
    });
    
    console.log('✅ Respuesta exitosa para fechas personalizadas (hace 3 meses)');
    console.log('📊 TypeBreakdown length:', response4.typeBreakdown?.length || 0);
    console.log('📊 TypeBreakdown data:');
    response4.typeBreakdown?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.label}: ${item.count} catas (${item.share?.toFixed(1)}%) ${item.note ? '[' + item.note + ']' : ''}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error en test 4:', error.message);
  }

  // Test 5: Período "hoy"
  console.log('📅 Test 5: Solo hoy');
  try {
    const response5 = await makeRequest('/api/dashboard/overview', {
      timePeriod: 'dia'
    });
    
    console.log('✅ Respuesta exitosa para hoy');
    console.log('📊 TypeBreakdown length:', response5.typeBreakdown?.length || 0);
    console.log('📊 TypeBreakdown data:');
    response5.typeBreakdown?.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.label}: ${item.count} catas (${item.share?.toFixed(1)}%) ${item.note ? '[' + item.note + ']' : ''}`);
    });
    console.log('');
  } catch (error) {
    console.error('❌ Error en test 5:', error.message);
  }

  console.log('🎯 === ANÁLISIS ===');
  console.log('Si los datos de typeBreakdown son IDÉNTICOS entre tests,');
  console.log('entonces el problema está en que el backend no filtra por fechas correctamente.');
  console.log('Si los datos son DIFERENTES, entonces el problema puede estar en el frontend.');
}

// Ejecutar tests
testTypeBreakdownFlow().catch(console.error);
