// backend/test/testDashboard.js
// Script para probar los endpoints del dashboard

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testDashboardEndpoints() {
  console.log('🧪 Iniciando pruebas de endpoints del dashboard...\n');

  // Test 1: Overview
  try {
    console.log('📊 Probando endpoint overview...');
    const response = await fetch(`${API_BASE}/api/dashboard/overview`);
    const data = await response.json();
    console.log('✅ Overview:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error en overview:', error.message);
  }

  // Test 2: Filter options
  const filterTypes = ['countries', 'tipos-yerba', 'marcas', 'origenes', 'paises-prod', 'tipos-secado'];
  
  for (const filterType of filterTypes) {
    try {
      console.log(`📋 Probando filtros para: ${filterType}...`);
      const response = await fetch(`${API_BASE}/api/dashboard/filters/${filterType}`);
      const data = await response.json();
      console.log(`✅ ${filterType}:`, data.slice(0, 3), '...'); // Solo primeros 3 items
    } catch (error) {
      console.log(`❌ Error en ${filterType}:`, error.message);
    }
  }

  // Test 3: Health check
  try {
    console.log('🏥 Probando health check...');
    const response = await fetch(`${API_BASE}/healthcheck`);
    const data = await response.json();
    console.log('✅ Health check:', data);
  } catch (error) {
    console.log('❌ Error en health check:', error.message);
  }

  console.log('\n🎉 Pruebas completadas!');
}

// Solo ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testDashboardEndpoints();
}

export default testDashboardEndpoints;
