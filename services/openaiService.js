import OpenAI from 'openai';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Cargar las tablas de conocimiento sobre yerba mate
    this.loadYerbaTables();
  }

  /**
   * Cargar las tablas de conocimiento técnico sobre yerba mate
   */
  loadYerbaTables() {
    try {
      const tablesPath = path.join(__dirname, '..', 'yerba_tables.json');
      this.yerbaTables = JSON.parse(readFileSync(tablesPath, 'utf8'));
      console.log('✅ Tablas de conocimiento de yerba mate cargadas correctamente');
    } catch (error) {
      console.error('❌ Error cargando tablas de yerba mate:', error);
      this.yerbaTables = null;
    }
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
    let knowledgeBase = '';
    
    if (this.yerbaTables) {
      knowledgeBase = `
CONOCIMIENTO TÉCNICO SOBRE YERBA MATE:

## SISTEMAS DE SECADO:
${this.yerbaTables.secado.map(item => 
  `• ${item.Sistema}: ${item.Procedimiento} → ${item["Efecto sensorial principal"]}`
).join('\n')}

## VARIABLES CLAVE DE COMPOSICIÓN:
${this.yerbaTables.variable_clave.map(item => 
  `• ${item["Variable clave"]}: Sin palo: ${item["Yerbas extra-finas sin palo"]} | Con palo: ${item["Yerbas con palo y corte medio"]}`
).join('\n')}

## IMPACTO DE LA MOLIENDA:
${this.yerbaTables.molienda_impacto.map(item => 
  `• ${item.Grado} (${item["Corte típico"]}): ${item.Impacto}`
).join('\n')}

## ESTACIONAMIENTO:
${this.yerbaTables.estacionamiento.map(item => 
  `• ${item.Modalidad} (${item.Tiempo}): ${item["Cambios principales"]}`
).join('\n')}

## TIPOS COMERCIALES:
${this.yerbaTables.tipos_comerciales.map(item => 
  `• ${item.Tipo}: ${item.Diferencial} → ${item.Experiencia}`
).join('\n')}

## ENFOQUES DE PRODUCCIÓN:
${this.yerbaTables.produccion.map(item => 
  `• ${item.Enfoque}: ${item.Características} → ${item.Resultado}`
).join('\n')}

## HIERBAS Y AÑADIDOS:
${this.yerbaTables.hierbas_y_añadidos.map(item => 
  `• ${item.Ingrediente}: ${item["Nota aromática"]} - ${item["Propósito tradicional"]}`
).join('\n')}

## ORÍGENES GEOGRÁFICOS:
${this.yerbaTables.origen_geografico.map(item => 
  `• ${item.Región}: ${item["Rasgos agronómicos"]} → ${item["Perfil típico"]}`
).join('\n')}

`;
    }

    return `Sos un sommelier experto en yerba mate. Tu tarea es interpretar el pedido en lenguaje natural de un usuario que busca una yerba específica para tomar mate.

${knowledgeBase}

INSTRUCCIONES:
1. Analizá cuidadosamente lo que el usuario solicita
2. Usá el conocimiento técnico arriba para identificar qué características se alinean mejor con sus necesidades
3. Inferí las características que no mencione explícitamente basándote en:
   - Combinaciones técnicas más habituales
   - Perfiles sensoriales que coincidan con su pedido
   - Relaciones entre origen, secado, molienda y experiencia de cebado
4. Si el usuario menciona hierbas específicas (menta, burro, coco, boldo, cedrón, etc.) o dice que quiere una yerba "compuesta", incluye esas hierbas en el campo "composicionBuscada"

Debés responder con un único objeto JSON válido, que incluya **todas las características** que debería tener la yerba ideal para esa persona. Aunque el usuario no mencione explícitamente una característica, **debes inferir la mejor opción posible** según el pedido, tu conocimiento del mate, y las combinaciones más habituales.

Usá **solo los valores permitidos** para cada campo (listados abajo). No inventes nuevos términos. Completá todos los campos del JSON, no dejes ninguno vacío.

Tu respuesta debe tener esta estructura:

{
  "containsPalo": string,            // "Sí" o "No"
  "leafCut": string,                 // Una de: "Extra fina", "Fina", "Media", "Gruesa", "Canchada"
  "origen": string,                  // Una de: "Misiones", "Corrientes", "Entre Ríos", "Rio Grande do Sul", "Paraná (BR)", "Santa Catarina", "Itapúa", "Alto Paraná", "Caazapá", "Canindeyú"
  "pais": string,                    // Una de: "Argentina", "Brasil", "Uruguay", "Paraguay"
  "secado": string,                  // Una de: "Barbacuá", "A cintas (sapecado)", "Rotativo/Túnel", "Carijó (indirecto a leña)"
  "tipoEstacionamiento": string,    // "Natural" o "Acelerado/Controlado"
  "tiempoEstacionamiento": string,  // Una de: "Sin estacionar (0-30 días)", "3-6 meses", "6-12 meses", "12-24 meses", ">24 meses"
  "produccion": string,              // Una de: "Industrial", "Artesanal/Familiar", "Agroecológica", "Orgánica certificada"
  "composicionBuscada": [string] | null  // Array de hierbas específicas mencionadas ("Menta", "Burro", "Coco", etc.) o null si no se mencionan
}

COMPOSICIONES DISPONIBLES: Menta, Burro, Coco, Peperina, Boldo, Cedrón, Poleo, Tilo, Manzanilla, Eucalipto, Limón, Naranja, Pomelo

NOTA IMPORTANTE: No incluyas el campo "tipo" en la respuesta. El tipo comercial se deducirá automáticamente basado en las características técnicas que proporciones.

EJEMPLOS DE RAZONAMIENTO:
- Si pide "suave para estómago sensible" → molienda gruesa + estacionamiento largo + secado indirecto
- Si pide "intensa para estudiar" → sin palo (despalada si es Argentina) + molienda fina + alta densidad de hoja
- Si pide "tradicional argentina" → con palo + secado barbacuá + estacionamiento natural
- Si pide "sin humo" → secado indirecto moderno o a cintas
- Si pide "que rinda mucho" → molienda fina + alta proporción de hoja + buena compactación
- Si pide "brasileña tradicional" → puede ser con o sin palo según preferencia, no necesariamente despalada
- Si pide "con menta para la digestión" → composicionBuscada: ["Menta"] + características que faciliten digestión
- Si pide "compuesta con hierbas digestivas" → composicionBuscada: ["Boldo", "Cedrón"] + producción artesanal
- Si pide "aromática cítrica"→ composicionBuscada: ["Cáscara de naranja / Limón"] + secado indirecto moderno + molienda media-fina
- Si pide "energética y espumosa" → despalada (≥ 90 % hoja) + molienda extra fina (≤ 0,5 mm) + alta densidad de hoja
- Si pide "rústica con toque ahumado" → secado Barbacuá + producción Artesanal / Barbacuá + molienda gruesa
- Si pide "relajante floral" → composicionBuscada: ["Manzanilla / Tilo / Melissa"] + secado indirecto moderno + estacionamiento Natural (9–24 meses)
- Si pide "premium reserva" → estacionamiento > 24 meses + molienda media-fina (≈ 1 mm) + extracción más lenta (partículas medianas)
- Si pide "orgánica limpia" → producción Orgánico / Agroecológico + secado indirecto moderno + molienda media-fina
- Si pide "para tereré refrescante" → secado a cintas (“sapecado”) + composicionBuscada: ["Cáscara de naranja / Limón"] + estacionamiento acelerado (30–90 días)
- Si pide "para competición deportiva" → despalada + molienda extra fina (≤ 0,5 mm) + densidad alta (40–50 g por calabaza) + secado a cintas
- Si pide "amargo prolongado" → molienda extra fina + alta proporción de hoja (≥ 90 %) + extracción muy rápida + estacionamiento Natural
- Si pide "suave con palo" → Tradicional con palo + molienda media-fina + estacionamiento Natural (9–24 meses)
No agregues ningún texto fuera del JSON. No expliques tus decisiones. Simplemente devolvé el objeto completo con los campos técnicos rellenados con los valores correctos.`;
  }

  /**
   * Validar y limpiar la respuesta de OpenAI
   */
  validateAndCleanResponse(response) {
    // Valores permitidos para cada campo
    const allowedValues = {
      containsPalo: ["Sí", "No"],
      leafCut: ["Extra fina", "Fina", "Media", "Gruesa", "Canchada"],
      origen: ["Misiones", "Corrientes", "Entre Ríos", "Rio Grande do Sul", "Paraná (BR)", "Santa Catarina", "Itapúa", "Alto Paraná", "Caazapá", "Canindeyú"],
      pais: ["Argentina", "Brasil", "Uruguay", "Paraguay"],
      secado: ["Barbacuá", "A cintas (sapecado)", "Rotativo/Túnel", "Carijó (indirecto a leña)"],
      tipoEstacionamiento: ["Natural", "Acelerado/Controlado"],
      tiempoEstacionamiento: ["Sin estacionar (0-30 días)", "3-6 meses", "6-12 meses", "12-24 meses", ">24 meses"],
      produccion: ["Industrial", "Artesanal/Familiar", "Agroecológica", "Orgánica certificada"],
      composicion: ["Menta", "Burro", "Coco", "Peperina", "Boldo", "Cedrón", "Poleo", "Tilo", "Manzanilla", "Eucalipto", "Limón", "Naranja", "Pomelo"]
    };

    const cleaned = {
      containsPalo: allowedValues.containsPalo.includes(response.containsPalo) ? response.containsPalo : allowedValues.containsPalo[0],
      leafCut: allowedValues.leafCut.includes(response.leafCut) ? response.leafCut : allowedValues.leafCut[0],
      origen: allowedValues.origen.includes(response.origen) ? response.origen : allowedValues.origen[0],
      pais: allowedValues.pais.includes(response.pais) ? response.pais : allowedValues.pais[0],
      secado: allowedValues.secado.includes(response.secado) ? response.secado : allowedValues.secado[0],
      tipoEstacionamiento: allowedValues.tipoEstacionamiento.includes(response.tipoEstacionamiento) ? response.tipoEstacionamiento : allowedValues.tipoEstacionamiento[0],
      tiempoEstacionamiento: allowedValues.tiempoEstacionamiento.includes(response.tiempoEstacionamiento) ? response.tiempoEstacionamiento : allowedValues.tiempoEstacionamiento[0],
      produccion: allowedValues.produccion.includes(response.produccion) ? response.produccion : allowedValues.produccion[0]
    };

    // Validar y limpiar composicionBuscada si está presente
    if (response.composicionBuscada && Array.isArray(response.composicionBuscada)) {
      const validComposiciones = response.composicionBuscada.filter(comp => 
        allowedValues.composicion.includes(comp)
      );
      if (validComposiciones.length > 0) {
        cleaned.composicionBuscada = validComposiciones;
      }
    }

    // NO agregamos el tipo aquí - será calculado solo cuando se guarde en la BD
    return cleaned;
  }

  /**
   * Deducir el tipo comercial basado en características técnicas
   */
  deducirTipo(caracteristicas) {
    const { pais, containsPalo, produccion, secado, leafCut } = caracteristicas;

    // Orgánica certificada
    if (produccion === "Orgánica certificada") {
      return "Orgánica";
    }

    // Barbacuá (secado especial)
    if (secado === "Barbacuá") {
      return "Barbacuá";
    }

    // Despalada (sin palo en Argentina/Uruguay)
    if (containsPalo === "No" && (pais === "Argentina" || pais === "Uruguay")) {
      return "Despalada";
    }

    // Suave (características que indican suavidad)
    if ((leafCut === "Gruesa" || leafCut === "Canchada") && containsPalo === "Sí") {
      return "Suave";
    }

    // Compuesta (si tiene características especiales o artesanales)
    if (produccion === "Artesanal/Familiar" && containsPalo === "Sí") {
      return "Compuesta";
    }

    // Premium/Selección (características premium)
    if (produccion === "Agroecológica" || leafCut === "Extra fina") {
      return "Premium/Selección";
    }

    // Por defecto: Tradicional
    return "Tradicional";
  }

  /**
   * Obtener estadísticas de uso del servicio
   */
  getUsageStats() {
    return {
      serviceEnabled: !!this.client,
      knowledgeBaseLoaded: !!this.yerbaTables,
      lastRequest: this.lastRequestTime || null,
      systemPromptVersion: '3.0-with-technical-knowledge',
      tablesLoaded: this.yerbaTables ? Object.keys(this.yerbaTables).length : 0
    };
  }

  /**
   * Generar ejemplo de prompt para ayudar a los usuarios
   */
  getExamplePrompts() {
    return [
      "Quiero una yerba suave para tomar en la mañana, sin mucho palo y que no sea muy amarga",
      "Busco algo intenso y duradero para estudiar, preferiblemente de Argentina",
      "Me gusta el sabor ahumado tipo barbacuá pero que no sea tan fuerte",
      "Necesito una yerba sin humo, bien equilibrada y que dure mucho en el mate",
      "Quiero algo tradicional de Misiones, con molienda media y bien estacionada",
      "Busco una yerba orgánica, suave, ideal para principiantes que tienen estómago sensible",
      "Necesito algo fuerte tipo despalada para compartir en rondas largas con amigos",
      "Quiero una yerba brasileña sin palo que haga mucha espuma y sea intensa",
      "Busco algo artesanal, con notas dulces y que sea de producción familiar",
      "Necesito una yerba compuesta con hierbas digestivas para después de comer"
    ];
  }
}

export default new OpenAIService();
