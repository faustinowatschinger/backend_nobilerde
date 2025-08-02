import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY no está configurada. El servicio de IA no funcionará.');
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Interpretar prompt del usuario y convertirlo a características de yerba
   */
  async interpretYerbaRequest(userPrompt, userRole = 'basic') {
    if (!this.client) {
      throw new Error('OpenAI no está configurado. Verifica tu API key.');
    }

    if (userRole !== 'pro') {
      throw new Error('Esta funcionalidad está disponible solo para usuarios PRO.');
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      
      const completion = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3, // Más determinístico para respuestas consistentes
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      console.log('🤖 Respuesta de OpenAI:', response);

      // Parsear y validar la respuesta JSON
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (parseError) {
        console.error('❌ Error parseando respuesta de OpenAI:', parseError);
        throw new Error('Error al interpretar la respuesta de la IA');
      }

      // Validar estructura de la respuesta
      const validatedResponse = this.validateAndCleanResponse(parsedResponse);
      
      return {
        success: true,
        interpretation: validatedResponse,
        originalPrompt: userPrompt,
        aiResponse: response,
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        }
      };

    } catch (error) {
      console.error('❌ Error en OpenAI Service:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error('Límite de tokens agotado. Intenta más tarde.');
      }
      
      if (error.code === 'rate_limit_exceeded') {
        throw new Error('Demasiadas solicitudes. Espera un momento.');
      }
      
      throw new Error(`Error de IA: ${error.message}`);
    }
  }

  /**
   * Construir el prompt del sistema para OpenAI
   */
  buildSystemPrompt() {
    return `Sos un sommelier experto en yerba mate. Tu tarea es interpretar el pedido en lenguaje natural de un usuario que busca una yerba específica para tomar mate.

Debés responder con un único objeto JSON válido, que incluya **todas las características** que debería tener la yerba ideal para esa persona. Aunque el usuario no mencione explícitamente una característica, **debes inferir la mejor opción posible** según el pedido, tu conocimiento del mate, y las combinaciones más habituales.

Usá **solo los valores permitidos** para cada campo (listados abajo). No inventes nuevos términos. Completá todos los campos del JSON, no dejes ninguno vacío.

Tu respuesta debe tener esta estructura:

{
  "tipo": string,                     // Una de: "Tradicional", "Suave", "Despalada", "Barbacuá", "Compuesta", "Orgánica", "Premium/Selección", "Instantánea (soluble)", "Saquitos/Tea Bags"
  "containsPalo": string,            // "Sí" o "No"
  "leafCut": string,                 // Una de: "Extra fina", "Fina", "Media", "Gruesa", "Canchada"
  "origen": string,                  // Una de: "Misiones", "Corrientes", "Entre Ríos", "Rio Grande do Sul", "Paraná (BR)", "Santa Catarina", "Itapúa", "Alto Paraná", "Caazapá", "Canindeyú"
  "pais": string,                    // Una de: "Argentina", "Brasil", "Uruguay", "Paraguay"
  "secado": string,                  // Una de: "Barbacuá", "A cintas (sapecado)", "Rotativo/Túnel", "Carijó (indirecto a leña)"
  "tipoEstacionamiento": string,    // "Natural" o "Acelerado/Controlado"
  "tiempoEstacionamiento": string,  // Una de: "Sin estacionar (0-30 días)", "3-6 meses", "6-12 meses", "12-24 meses", ">24 meses"
  "produccion": string               // Una de: "Industrial", "Artesanal/Familiar", "Agroecológica", "Orgánica certificada"
}
No agregues ningún texto fuera del JSON. No expliques tus decisiones. Simplemente devolvé el objeto completo con los 13 campos rellenados con los valores correctos.`;
  }

  /**
   * Validar y limpiar la respuesta de OpenAI
   */
  validateAndCleanResponse(response) {
    // Valores permitidos para cada campo
    const allowedValues = {
      tipo: ["Tradicional", "Suave", "Despalada", "Barbacuá", "Compuesta", "Orgánica", "Premium/Selección", "Instantánea (soluble)", "Saquitos/Tea Bags"],
      containsPalo: ["Sí", "No"],
      leafCut: ["Extra fina", "Fina", "Media", "Gruesa", "Canchada"],
      origen: ["Misiones", "Corrientes", "Entre Ríos", "Rio Grande do Sul", "Paraná (BR)", "Santa Catarina", "Itapúa", "Alto Paraná", "Caazapá", "Canindeyú"],
      pais: ["Argentina", "Brasil", "Uruguay", "Paraguay"],
      secado: ["Barbacuá", "A cintas (sapecado)", "Rotativo/Túnel", "Carijó (indirecto a leña)"],
      tipoEstacionamiento: ["Natural", "Acelerado/Controlado"],
      tiempoEstacionamiento: ["Sin estacionar (0-30 días)", "3-6 meses", "6-12 meses", "12-24 meses", ">24 meses"],
      produccion: ["Industrial", "Artesanal/Familiar", "Agroecológica", "Orgánica certificada"]
    };

    const allowedBrands = ["Amanda","Andresito","Aguantadora","CBSé","Cachamate","Cruz de Malta","Kraus","La Merced","Mañanita","Mate Rojo","Nobleza Gaucha","Origen","Playadito","Piporé","Rosamonte","Taragüi","Unión","Titrayjú","Kalena","Barão de Cotegipe","Baldo","Rei Verde","Ximango","Yacuy","Mate Leão","Canarias","Sara","Del Cebador","Contigo","Baldo (UY)","Pajarito","Selecta","Kurupi","Campesino","Colón","Guaraní","Ruvicha","La Rubia","Indega","Guayakí","Grapia Milenaria","Jesper","Mate Amos","Federal","Mateando"];

    const allowedEstablecimientos = ["Las Marías","Coop. Colonia Liebig","Coop. Yerba Andresito","Molinos La Misión","Coop. Agrícola Oberá","Hreñuk S.A. (Rosamonte)","CBT (Playadito)","La Cachamate S.A.","Kraus S.A.","Indústrias Barão","Baldo S.A.","Rei Verde Industria de Erva-Mate","Sara S.A.","Pajarito S.R.L.","Selecta S.A.","Kurupi Laboratorios y Herbarios","Campesino S.A.","Guayakí SRP","Mate Leão (Coca-Cola)","Santo Pipó SCL","San Demetrio","La Cachuera","Carrau & Cia"];

    const cleaned = {
      tipo: allowedValues.tipo.includes(response.tipo) ? response.tipo : allowedValues.tipo[0],
      containsPalo: allowedValues.containsPalo.includes(response.containsPalo) ? response.containsPalo : allowedValues.containsPalo[0],
      leafCut: allowedValues.leafCut.includes(response.leafCut) ? response.leafCut : allowedValues.leafCut[0],
      origen: allowedValues.origen.includes(response.origen) ? response.origen : allowedValues.origen[0],
      pais: allowedValues.pais.includes(response.pais) ? response.pais : allowedValues.pais[0],
      secado: allowedValues.secado.includes(response.secado) ? response.secado : allowedValues.secado[0],
      tipoEstacionamiento: allowedValues.tipoEstacionamiento.includes(response.tipoEstacionamiento) ? response.tipoEstacionamiento : allowedValues.tipoEstacionamiento[0],
      tiempoEstacionamiento: allowedValues.tiempoEstacionamiento.includes(response.tiempoEstacionamiento) ? response.tiempoEstacionamiento : allowedValues.tiempoEstacionamiento[0],
      produccion: allowedValues.produccion.includes(response.produccion) ? response.produccion : allowedValues.produccion[0]
    };

    return cleaned;
  }

  /**
   * Obtener estadísticas de uso del servicio
   */
  getUsageStats() {
    return {
      serviceEnabled: !!this.client,
      lastRequest: this.lastRequestTime || null,
      systemPromptVersion: '2.0-13fields'
    };
  }

  /**
   * Generar ejemplo de prompt para ayudar a los usuarios
   */
  getExamplePrompts() {
    return [
      "Quiero una yerba suave para tomar en la mañana, sin mucho palo y que no sea muy amarga",
      "Busco algo intenso y duradero para estudiar, preferiblemente de Argentina",
      "Me gusta Amanda tradicional pero quiero probar algo similar de otra marca",
      "Necesito una yerba sin humo, tipo barbacuá, que sea equilibrada y dure mucho",
      "Quiero algo tradicional de Misiones, con molienda media y bien estacionada",
      "Busco una yerba orgánica, suave, ideal para principiantes",
      "Necesito algo fuerte tipo despalada para compartir en rondas largas"
    ];
  }
}

export default new OpenAIService();
