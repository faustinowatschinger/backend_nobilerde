// Script para probar el sistema de recomendaciones con composiciones
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import openaiService from '../services/openaiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno desde el directorio raíz del backend
config({ path: path.join(__dirname, '..', '.env') });

// Importar después de cargar las variables de entorno
const { Yerba } = await import('../config/yerbasModel.js');

async function testRecommendationSystem() {
  console.log('🧪 Iniciando pruebas del sistema de recomendaciones...\n');

  try {
    // 1. Verificar si hay yerbas compuestas en la base de datos
    console.log('1. Verificando yerbas compuestas en la base de datos...');
    const yerbaCompuesta = await Yerba.findOne({ 
      tipo: 'Compuesta',
      composicion: { $exists: true, $ne: [] }
    });
    
    if (yerbaCompuesta) {
      console.log('✅ Yerba compuesta encontrada:', {
        nombre: yerbaCompuesta.nombre,
        marca: yerbaCompuesta.marca,
        tipo: yerbaCompuesta.tipo,
        composicion: yerbaCompuesta.composicion
      });
    } else {
      console.log('⚠️ No se encontraron yerbas compuestas con composiciones.');
      
      // Crear una yerba compuesta de prueba
      console.log('📝 Creando yerba compuesta de prueba...');
      const yerbaPrueba = new Yerba({
        nombre: 'Yerba Compuesta Test',
        marca: 'Test Brand',
        tipo: 'Compuesta',
        containsPalo: 'Sí',
        leafCut: 'Media',
        origen: 'Misiones',
        pais: 'Argentina',
        secado: 'A cintas (sapecado)',
        tipoEstacionamiento: 'Natural',
        tiempoEstacionamiento: '6-12 meses',
        produccion: 'Artesanal/Familiar',
        composicion: ['Menta', 'Boldo', 'Cedrón'],
        puntuacion: 4.5
      });
      
      await yerbaPrueba.save();
      console.log('✅ Yerba compuesta de prueba creada');
    }

    // 2. Probar deducción de tipo
    console.log('\n2. Probando deducción de tipo...');
    const caracteristicasCompuesta = {
      containsPalo: 'Sí',
      leafCut: 'Media',
      origen: 'Misiones',
      pais: 'Argentina',
      secado: 'A cintas (sapecado)',
      tipoEstacionamiento: 'Natural',
      tiempoEstacionamiento: '6-12 meses',
      produccion: 'Artesanal/Familiar'
    };
    
    const tipoDeducido = openaiService.deducirTipo(caracteristicasCompuesta);
    console.log('🤖 Tipo deducido:', tipoDeducido);

    // 3. Simular búsqueda de recomendaciones para yerba compuesta
    console.log('\n3. Simulando búsqueda de recomendaciones...');
    
    // Búsqueda sin composición específica
    const queryBasica = {
      containsPalo: true,
      produccion: 'Artesanal/Familiar'
    };
    
    console.log('🔍 Query básica:', queryBasica);
    const resultadosBasicos = await Yerba.find(queryBasica).limit(5);
    console.log(`📊 Resultados básicos: ${resultadosBasicos.length} yerbas encontradas`);
    
    // Búsqueda con composición específica
    const queryConComposicion = {
      containsPalo: true,
      produccion: 'Artesanal/Familiar',
      composicion: { $in: ['Menta'] }
    };
    
    console.log('🔍 Query con composición (Menta):', queryConComposicion);
    const resultadosConComposicion = await Yerba.find(queryConComposicion).limit(5);
    console.log(`📊 Resultados con Menta: ${resultadosConComposicion.length} yerbas encontradas`);
    
    if (resultadosConComposicion.length > 0) {
      console.log('✅ Yerba encontrada con composición:', {
        nombre: resultadosConComposicion[0].nombre,
        composicion: resultadosConComposicion[0].composicion
      });
    }

    // 4. Probar diferentes combinaciones de composición
    console.log('\n4. Probando diferentes composiciones...');
    const composicionesAPprobar = ['Boldo', 'Cedrón', 'Menta', 'Burro'];
    
    for (const comp of composicionesAPprobar) {
      const query = { composicion: comp };
      const resultados = await Yerba.find(query);
      console.log(`📝 Yerbas con ${comp}: ${resultados.length}`);
    }

    console.log('\n✅ Pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testRecommendationSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
