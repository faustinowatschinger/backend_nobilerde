// backend/scripts/testRoutes.js
import express from 'express';

// Test if the metrics routes module can be imported
try {
  console.log('🧪 Testing metrics routes import...');
  const metricsRoutes = await import('../routes/metricsRoutes.js');
  console.log('✅ Metrics routes imported successfully');
  console.log('📋 Route export type:', typeof metricsRoutes.default);
  
  // Create a test app to check if routes can be mounted
  const testApp = express();
  testApp.use('/api/metrics', metricsRoutes.default);
  console.log('✅ Routes mounted successfully on test app');
  
} catch (error) {
  console.error('❌ Error importing metrics routes:', error);
  console.error('Stack:', error.stack);
}

// Test auth middleware import
try {
  console.log('\n🧪 Testing auth middleware import...');
  const { authenticateToken, requireRole } = await import('../auth/middleware/authMiddleware.js');
  console.log('✅ Auth middleware imported successfully');
  console.log('📋 authenticateToken type:', typeof authenticateToken);
  console.log('📋 requireRole type:', typeof requireRole);
  
} catch (error) {
  console.error('❌ Error importing auth middleware:', error);
  console.error('Stack:', error.stack);
}

// Test metrics aggregator import
try {
  console.log('\n🧪 Testing metrics aggregator import...');
  const metricsAggregator = await import('../services/metricsAggregator.js');
  console.log('✅ Metrics aggregator imported successfully');
  console.log('📋 Aggregator type:', typeof metricsAggregator.default);
  
} catch (error) {
  console.error('❌ Error importing metrics aggregator:', error);
  console.error('Stack:', error.stack);
}

console.log('\n🎯 Route import test completed.');
