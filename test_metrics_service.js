import mongoose from 'mongoose';
import metricsService from './services/metricsService.js';

async function testMetricsService() {
  try {
    console.log('🔍 Test directo del MetricsService...');
    
    // Fechas para hoy
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('📅 Período:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString()
    });
    
    // Test getSampleInfo directamente
    console.log('\n🔍 Test getSampleInfo...');
    const sampleInfo = await metricsService.getSampleInfo({}, todayStart, todayEnd);
    console.log('📊 Resultado getSampleInfo:', sampleInfo);
    
    // Test getOverviewData
    console.log('\n🔍 Test getOverviewData...');
    const overviewData = await metricsService.getOverviewData({
      startDate: todayStart.toISOString(),
      endDate: todayEnd.toISOString(),
      timePeriod: 'dia'
    });
    
    console.log('📊 Resultado getOverviewData:', {
      activeUsers: overviewData.activeUsers,
      sample: overviewData.sample
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMetricsService();
