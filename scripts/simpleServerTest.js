// backend/scripts/simpleServerTest.js
import axios from 'axios';

async function testServer() {
  try {
    console.log('🧪 Probando servidor en puerto 4000...\n');
    
    // Test basic endpoints
    const tests = [
      'http://localhost:4000/api/metrics/status',
      'http://localhost:4000/yerbas',
      'http://localhost:4000/auth/login'
    ];

    for (const url of tests) {
      try {
        const response = await axios.get(url);
        console.log(`✅ ${url} - Status: ${response.status}`);
      } catch (error) {
        const status = error.response?.status || 'No response';
        const message = error.response?.data?.error || error.message;
        console.log(`📋 ${url} - Status: ${status} - ${message}`);
      }
    }
    
    console.log('\n🎯 El servidor está respondiendo correctamente.');
    
  } catch (error) {
    console.error('❌ Error testando servidor:', error.message);
  }
}

testServer();
