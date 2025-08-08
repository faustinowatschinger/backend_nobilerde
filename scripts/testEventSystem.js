// backend/scripts/testEventSystem.js
import Event from '../config/eventModel.js';
import EventTracker from '../middleware/eventTracker.js';
import metricsAggregator from '../services/metricsAggregator.js';
import { usersConn, yerbasConn } from '../config/multiDB.js';

/**
 * Script de testing para el sistema de eventos y métricas
 * Uso: node scripts/testEventSystem.js
 */

async function testEventSystem() {
  console.log('🧪 Iniciando tests del sistema de eventos...');

  try {
    // Test 1: Crear eventos de muestra
    await testCreateSampleEvents();
    
    // Test 2: Generar métricas
    await testMetricsGeneration();
    
    // Test 3: Validar tracking automático
    await testEventTracking();
    
    // Test 4: Verificar k-anonimato
    await testKAnonymity();
    
    console.log('✅ Todos los tests completados exitosamente');
    
  } catch (error) {
    console.error('❌ Error en tests:', error);
  } finally {
    // Cerrar conexiones
    await usersConn.close();
    await yerbasConn.close();
    process.exit(0);
  }
}

/**
 * Test 1: Crear eventos de muestra para testing
 */
async function testCreateSampleEvents() {
  console.log('\n📝 Test 1: Creando eventos de muestra...');
  
  try {
    // Obtener algunos usuarios y yerbas para usar como referencia
    const User = usersConn.model('User');
    const users = await User.find().limit(5).lean();
    
    if (users.length === 0) {
      console.log('⚠️ No hay usuarios en la base de datos para testing');
      return;
    }
    
    const Yerba = yerbasConn.model('Yerba');
    const yerbas = await Yerba.find().limit(10).lean();
    
    if (yerbas.length === 0) {
      console.log('⚠️ No hay yerbas en la base de datos para testing');
      return;
    }
    
    // Crear eventos de muestra
    const sampleEvents = [];
    const eventTypes = ['view_yerba', 'search', 'add_shelf', 'rate', 'ai_request'];
    
    for (let i = 0; i < 100; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomYerba = yerbas[Math.floor(Math.random() * yerbas.length)];
      const randomEventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      const eventData = {
        user: randomUser._id,
        type: randomEventType,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
      };
      
      // Agregar datos específicos según el tipo
      if (['view_yerba', 'add_shelf', 'rate'].includes(randomEventType)) {
        eventData.yerba = randomYerba._id;
      }
      
      if (randomEventType === 'rate') {
        eventData.score = Math.floor(Math.random() * 5) + 1;
        eventData.notes = ['amargo', 'suave', 'herbal', 'intenso'][Math.floor(Math.random() * 4)];
      }
      
      if (randomEventType === 'search') {
        eventData.searchQuery = ['yerba suave', 'con palo', 'argentina', 'intenso'][Math.floor(Math.random() * 4)];
        eventData.filters = ['tipo:tradicional', 'pais:Argentina'];
      }
      
      sampleEvents.push(eventData);
    }
    
    // Insertar eventos en batch
    const insertedEvents = await Event.insertMany(sampleEvents);
    console.log(`✅ Creados ${insertedEvents.length} eventos de muestra`);
    
  } catch (error) {
    console.error('❌ Error creando eventos de muestra:', error);
    throw error;
  }
}

/**
 * Test 2: Generar y verificar métricas
 */
async function testMetricsGeneration() {
  console.log('\n📊 Test 2: Generando métricas...');
  
  try {
    const startTime = Date.now();
    
    // Generar todas las métricas
    await metricsAggregator.generateAllMetrics();
    
    const duration = Date.now() - startTime;
    console.log(`✅ Métricas generadas en ${duration}ms`);
    
    // Verificar que las métricas se guardaron
    const collections = [
      'metrics_top_yerbas',
      'metrics_flavor_notes',
      'metrics_trends',
      'metrics_user_behavior',
      'metrics_discovery'
    ];
    
    for (const collectionName of collections) {
      const metrics = await metricsAggregator.getMetrics(collectionName, {}, 5);
      console.log(`📈 ${collectionName}: ${metrics.length} documentos`);
    }
    
  } catch (error) {
    console.error('❌ Error generando métricas:', error);
    throw error;
  }
}

/**
 * Test 3: Testing de tracking automático
 */
async function testEventTracking() {
  console.log('\n🎯 Test 3: Testing tracking automático...');
  
  try {
    const User = usersConn.model('User');
    const testUser = await User.findOne().lean();
    
    if (!testUser) {
      console.log('⚠️ No hay usuarios para testing de tracking');
      return;
    }
    
    // Test tracking manual
    await EventTracker.trackEvent(testUser._id, 'search', {
      searchQuery: 'test search',
      filters: ['tipo:test'],
      resultsCount: 5
    });
    
    console.log('✅ Tracking manual funcionando');
    
    // Test tracking de rating
    const Yerba = yerbasConn.model('Yerba');
    const testYerba = await Yerba.findOne().lean();
    
    if (testYerba) {
      await EventTracker.trackRating(testUser._id, testYerba._id, 4, ['suave', 'herbal'], 'Test comment');
      console.log('✅ Tracking de rating funcionando');
    }
    
    // Test obtener eventos de usuario
    const userEvents = await EventTracker.getUserRecentEvents(testUser._id, 10);
    console.log(`✅ Obtenidos ${userEvents.length} eventos del usuario`);
    
  } catch (error) {
    console.error('❌ Error en tracking automático:', error);
    throw error;
  }
}

/**
 * Test 4: Verificar k-anonimato
 */
async function testKAnonymity() {
  console.log('\n🔒 Test 4: Verificando k-anonimato...');
  
  try {
    // Verificar que las métricas respetan el umbral de k-anonimato
    const metrics = await metricsAggregator.getMetrics('metrics_top_yerbas', {}, 10);
    
    const minThreshold = 50;
    let violationsCount = 0;
    
    for (const metric of metrics) {
      if (metric.uniqueUserCount && metric.uniqueUserCount < minThreshold) {
        violationsCount++;
      }
    }
    
    if (violationsCount === 0) {
      console.log('✅ K-anonimato respetado en todas las métricas');
    } else {
      console.log(`⚠️ ${violationsCount} métricas violan k-anonimato (threshold: ${minThreshold})`);
    }
    
    // Verificar que no se exponen datos personales
    const sampleMetric = metrics[0];
    if (sampleMetric && !sampleMetric.uniqueUsers) {
      console.log('✅ Datos personales no expuestos en métricas');
    } else {
      console.log('⚠️ Posible exposición de datos personales');
    }
    
  } catch (error) {
    console.error('❌ Error verificando k-anonimato:', error);
    throw error;
  }
}

/**
 * Función auxiliar para obtener estadísticas generales
 */
async function getSystemStats() {
  console.log('\n📈 Estadísticas del sistema:');
  
  try {
    const totalEvents = await Event.countDocuments();
    console.log(`📊 Total de eventos: ${totalEvents}`);
    
    const eventsByType = await Event.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('📋 Eventos por tipo:');
    eventsByType.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });
    
    const recentEvents = await Event.find()
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();
    
    console.log('\n🕒 Eventos recientes:');
    recentEvents.forEach(event => {
      console.log(`  ${event.type} - ${event.timestamp.toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
  }
}

// Ejecutar tests si el script se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testEventSystem();
}

export {
  testCreateSampleEvents,
  testMetricsGeneration,
  testEventTracking,
  testKAnonymity,
  getSystemStats
};
