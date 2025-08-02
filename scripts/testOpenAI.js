// Script para probar la integración de OpenAI
import openaiService from '../services/openaiService.js';

async function testOpenAIIntegration() {
  try {
    console.log('🧪 Probando integración con OpenAI...');

    // Ejemplo 1: Solicitud básica
    const prompt1 = "Quiero una yerba suave para tomar en la mañana, que no sea muy amarga";
    console.log(`\n📝 Prompt: "${prompt1}"`);
    
    const result1 = await openaiService.interpretYerbaRequest(prompt1, 'pro');
    console.log('✅ Resultado:', JSON.stringify(result1.interpretation, null, 2));

    // Ejemplo 2: Solicitud más específica
    const prompt2 = "Busco algo como Amanda pero más intenso, que sea bueno para estudiar";
    console.log(`\n📝 Prompt: "${prompt2}"`);
    
    const result2 = await openaiService.interpretYerbaRequest(prompt2, 'pro');
    console.log('✅ Resultado:', JSON.stringify(result2.interpretation, null, 2));

    // Ejemplo 3: Con características específicas
    const prompt3 = "Necesito una yerba sin humo, tradicional argentina, que dure mucho y tenga buen cuerpo";
    console.log(`\n📝 Prompt: "${prompt3}"`);
    
    const result3 = await openaiService.interpretYerbaRequest(prompt3, 'pro');
    console.log('✅ Resultado:', JSON.stringify(result3.interpretation, null, 2));

    console.log('\n🎉 Todas las pruebas completadas exitosamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('💡 Asegúrate de que tu OPENAI_API_KEY esté configurada correctamente en .env');
    }
  }
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testOpenAIIntegration();
}

export default testOpenAIIntegration;
