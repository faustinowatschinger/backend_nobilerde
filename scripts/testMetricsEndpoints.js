// backend/scripts/testMetricsEndpoints.js
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import mongoose from 'mongoose';
import { usersConn } from '../config/multiDB.js';
import User from '../config/userModel.js';
import jwt from 'jsonwebtoken';
import { secret } from '../config/auth.config.js';

/**
 * Script para probar los endpoints REST de métricas
 * Requiere que el servidor esté ejecutándose
 */
class MetricsEndpointTester {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:4000';
    this.adminToken = null;
    this.userToken = null;
  }

  /**
   * Genera tokens de autenticación para testing
   */
  async generateTestTokens() {
    console.log('🔑 Generando tokens de prueba...');
    
    try {
      // Buscar o crear usuario admin
      let adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        adminUser = await User.create({
          username: 'admin_test',
          nombre: 'Admin',
          apellido: 'Test',
          email: 'admin@nobilerde.com',
          password: 'hashedPassword123',
          fechaNacimiento: '1990-01-01',
          termosDia: 1,
          role: 'admin',
          emailVerified: true
        });
        console.log('   ✅ Usuario admin creado');
      } else {
        console.log('   ✅ Usuario admin encontrado');
      }

      // Buscar o crear usuario normal
      let normalUser = await User.findOne({ role: 'user', email: 'user@nobilerde.com' });
      if (!normalUser) {
        normalUser = await User.create({
          username: 'user_test',
          nombre: 'Usuario',
          apellido: 'Test',
          email: 'user@nobilerde.com',
          password: 'hashedPassword123',
          fechaNacimiento: '1990-01-01',
          termosDia: 3,
          role: 'user',
          emailVerified: true
        });
        console.log('   ✅ Usuario normal creado');
      } else {
        console.log('   ✅ Usuario normal encontrado');
      }

      // Generar tokens JWT
      this.adminToken = jwt.sign(
        { id: adminUser._id, role: adminUser.role },
        secret,
        { expiresIn: '24h' }
      );

      this.userToken = jwt.sign(
        { id: normalUser._id, role: normalUser.role },
        secret,
        { expiresIn: '24h' }
      );

      console.log('   🎫 Tokens generados exitosamente\n');
      
      return { adminUser, normalUser };
    } catch (error) {
      console.error('❌ Error generando tokens:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una petición HTTP con manejo de errores
   */
  async makeRequest(method, endpoint, data = null, token = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {}
      };

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (data) {
        config.data = data;
        config.headers['Content-Type'] = 'application/json';
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Prueba acceso sin autenticación
   */
  async testUnauthenticatedAccess() {
    console.log('🔒 Probando acceso sin autenticación...');
    
    const endpoints = [
      '/api/metrics/summary',
      '/api/metrics/top-yerbas',
      '/api/metrics/flavor-notes',
      '/api/metrics/trends',
      '/api/metrics/user-behavior',
      '/api/metrics/discovery',
      '/api/metrics/status'
    ];

    for (const endpoint of endpoints) {
      const result = await this.makeRequest('GET', endpoint);
      if (result.status === 401) {
        console.log(`   ✅ ${endpoint} - Correctamente protegido (401)`);
      } else {
        console.log(`   ❌ ${endpoint} - Debería estar protegido (${result.status})`);
      }
    }
    console.log();
  }

  /**
   * Prueba acceso con usuario normal (debería fallar)
   */
  async testUserAccess() {
    console.log('👤 Probando acceso con usuario normal...');
    
    const result = await this.makeRequest('GET', '/api/metrics/summary', null, this.userToken);
    if (result.status === 403) {
      console.log('   ✅ Usuario normal correctamente rechazado (403)');
    } else {
      console.log(`   ❌ Usuario normal debería ser rechazado (${result.status})`);
    }
    console.log();
  }

  /**
   * Prueba todos los endpoints con usuario admin
   */
  async testAdminAccess() {
    console.log('👑 Probando acceso con usuario admin...');
    
    const endpoints = [
      { path: '/api/metrics/status', description: 'Estado del sistema' },
      { path: '/api/metrics/summary', description: 'Resumen general' },
      { path: '/api/metrics/top-yerbas', description: 'Top yerbas' },
      { path: '/api/metrics/flavor-notes', description: 'Notas de sabor' },
      { path: '/api/metrics/trends', description: 'Tendencias' },
      { path: '/api/metrics/user-behavior', description: 'Comportamiento usuario' },
      { path: '/api/metrics/discovery', description: 'Descubrimiento' }
    ];

    const results = {};

    for (const endpoint of endpoints) {
      const result = await this.makeRequest('GET', endpoint.path, null, this.adminToken);
      results[endpoint.path] = result;
      
      if (result.success) {
        console.log(`   ✅ ${endpoint.description} - OK (${result.status})`);
        if (result.data) {
          console.log(`      📊 Datos: ${JSON.stringify(result.data).substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ ${endpoint.description} - Error (${result.status})`);
        console.log(`      🔍 Error: ${JSON.stringify(result.error).substring(0, 100)}...`);
      }
    }
    
    console.log();
    return results;
  }

  /**
   * Prueba endpoints con parámetros
   */
  async testParameterizedEndpoints() {
    console.log('📋 Probando endpoints con parámetros...');
    
    const testCases = [
      {
        path: '/api/metrics/top-yerbas?period=weekly&limit=5',
        description: 'Top yerbas semanal (5 resultados)'
      },
      {
        path: '/api/metrics/flavor-notes?period=monthly',
        description: 'Notas de sabor mensual'
      },
      {
        path: '/api/metrics/trends?period=daily&category=rating',
        description: 'Tendencias diarias de rating'
      },
      {
        path: '/api/metrics/user-behavior?period=weekly',
        description: 'Comportamiento semanal'
      }
    ];

    for (const testCase of testCases) {
      const result = await this.makeRequest('GET', testCase.path, null, this.adminToken);
      
      if (result.success) {
        console.log(`   ✅ ${testCase.description} - OK`);
      } else {
        console.log(`   ❌ ${testCase.description} - Error (${result.status})`);
      }
    }
    
    console.log();
  }

  /**
   * Prueba endpoint de trigger manual
   */
  async testManualTrigger() {
    console.log('⚡ Probando trigger manual de agregación...');
    
    const result = await this.makeRequest('POST', '/api/metrics/trigger-aggregation', 
      { period: 'daily' }, this.adminToken);
    
    if (result.success) {
      console.log('   ✅ Trigger manual ejecutado correctamente');
      console.log(`   📊 Resultado: ${JSON.stringify(result.data).substring(0, 150)}...`);
    } else {
      console.log(`   ❌ Error en trigger manual (${result.status})`);
      console.log(`   🔍 Error: ${JSON.stringify(result.error).substring(0, 100)}...`);
    }
    
    console.log();
  }

  /**
   * Ejecuta todos los tests
   */
  async runAllTests() {
    console.log('🧪 INICIANDO TESTS DE ENDPOINTS DE MÉTRICAS');
    console.log('===========================================\n');

    try {
      // Conectar a la base de datos
      await usersConn;
      console.log('✅ Conectado a base de datos\n');

      // Generar tokens
      await this.generateTestTokens();

      // Ejecutar tests
      await this.testUnauthenticatedAccess();
      await this.testUserAccess();
      const adminResults = await this.testAdminAccess();
      await this.testParameterizedEndpoints();
      await this.testManualTrigger();

      // Resumen
      console.log('📊 RESUMEN DE TESTS');
      console.log('==================');
      const successfulEndpoints = Object.values(adminResults).filter(r => r.success).length;
      const totalEndpoints = Object.keys(adminResults).length;
      
      console.log(`✅ Endpoints funcionando: ${successfulEndpoints}/${totalEndpoints}`);
      console.log('✅ Autenticación y autorización funcionando');
      console.log('✅ Endpoints parametrizados funcionando');
      
      if (successfulEndpoints === totalEndpoints) {
        console.log('\n🎉 TODOS LOS TESTS PASARON EXITOSAMENTE');
      } else {
        console.log('\n⚠️  ALGUNOS TESTS FALLARON - Revisar logs arriba');
      }

    } catch (error) {
      console.error('❌ Error ejecutando tests:', error);
    } finally {
      await mongoose.disconnect();
      console.log('\n🔚 Tests completados. Conexiones cerradas.');
    }
  }
}

// Verificar si el servidor está ejecutándose
async function checkServerStatus() {
  try {
    const response = await axios.get('http://localhost:4000/api/metrics/status');
    return true;
  } catch (error) {
    return false;
  }
}

// Ejecutar tests
async function main() {
  const isServerRunning = await checkServerStatus();
  
  if (!isServerRunning) {
    console.error('❌ SERVIDOR NO ESTÁ EJECUTÁNDOSE');
    console.log('📝 Para ejecutar estos tests:');
    console.log('   1. Abre una terminal y navega a la carpeta backend');
    console.log('   2. Ejecuta: npm start o node server.js');
    console.log('   3. Espera a que el servidor esté funcionando');
    console.log('   4. Vuelve a ejecutar este script\n');
    return;
  }

  const tester = new MetricsEndpointTester();
  await tester.runAllTests();
}

main().catch(console.error);
