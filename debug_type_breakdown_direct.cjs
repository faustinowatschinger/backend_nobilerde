// Script de debug para analizar el problema directamente con la base de datos
// Este script se ejecuta desde el directorio backend

require('dotenv').config();
const mongoose = require('mongoose');

// Importar usando require con ruta relativa
async function loadMetricsService() {
  const module = await import('./services/metricsService.js');
  return module.MetricsService;
}

// Configurar conexión a la base de datos
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

async function testTypeBreakdownDirectly() {
  console.log('🔬 === TESTING TYPE BREAKDOWN DIRECTAMENTE ===\n');
  
  await connectDB();
  
  // Cargar MetricsService
  const MetricsService = await loadMetricsService();
  const metricsService = new MetricsService();
  
  // Test 1: Últimos 7 días
  console.log('📅 Test 1: Últimos 7 días');
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  
  const userQuery1 = {};
  const yerbaQuery1 = {};
  
  try {
    const result1 = await metricsService.getTypeBreakdown(userQuery1, yerbaQuery1, sevenDaysAgo, now);
    console.log('📊 Resultado 7 días:', {
      length: result1.length,
      data: result1.map(item => ({ label: item.label, count: item.count, share: item.share?.toFixed(1) }))
    });
  } catch (error) {
    console.error('❌ Error en test 1:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: Últimos 30 días
  console.log('📅 Test 2: Últimos 30 días');
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  try {
    const result2 = await metricsService.getTypeBreakdown(userQuery1, yerbaQuery1, thirtyDaysAgo, now);
    console.log('📊 Resultado 30 días:', {
      length: result2.length,
      data: result2.map(item => ({ label: item.label, count: item.count, share: item.share?.toFixed(1) }))
    });
  } catch (error) {
    console.error('❌ Error en test 2:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 3: Solo hoy
  console.log('📅 Test 3: Solo hoy');
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  
  try {
    const result3 = await metricsService.getTypeBreakdown(userQuery1, yerbaQuery1, startOfToday, endOfToday);
    console.log('📊 Resultado solo hoy:', {
      length: result3.length,
      data: result3.map(item => ({ label: item.label, count: item.count, share: item.share?.toFixed(1) }))
    });
  } catch (error) {
    console.error('❌ Error en test 3:', error.message);
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 4: Rango histórico (hace 3 meses)
  console.log('📅 Test 4: Hace 3 meses');
  const fourMonthsAgo = new Date(now.getTime() - (4 * 30 * 24 * 60 * 60 * 1000));
  const threeMonthsAgo = new Date(now.getTime() - (3 * 30 * 24 * 60 * 60 * 1000));
  
  try {
    const result4 = await metricsService.getTypeBreakdown(userQuery1, yerbaQuery1, fourMonthsAgo, threeMonthsAgo);
    console.log('📊 Resultado hace 3 meses:', {
      length: result4.length,
      data: result4.map(item => ({ label: item.label, count: item.count, share: item.share?.toFixed(1) }))
    });
  } catch (error) {
    console.error('❌ Error en test 4:', error.message);
  }
  
  console.log('\n🎯 === ANÁLISIS ===');
  console.log('Si todos los resultados son IDÉNTICOS o muy similares,');
  console.log('es probable que los datos de prueba sean limitados.');
  console.log('Si son DIFERENTES, entonces la lógica funciona correctamente.');
  
  // Cerrar conexión
  await mongoose.disconnect();
  console.log('🔌 Desconectado de MongoDB');
}

// Ejecutar test
testTypeBreakdownDirectly().catch(console.error);
