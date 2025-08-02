import express from 'express';
import openaiService from '../services/openaiService.js';
import { authenticateToken, requireRole } from '../auth/middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/ai/interpret-yerba
 * Interpretar prompt del usuario y convertirlo a características de yerba
 */
router.post('/interpret-yerba', authenticateToken, requireRole('pro'), async (req, res) => {
  try {
    const { prompt } = req.body;
    const userRole = req.userRole || 'basic';

    // Validar que el prompt esté presente
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'El prompt es requerido y debe ser un texto válido'
      });
    }

    // Validar longitud del prompt
    if (prompt.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'El prompt no puede exceder 1000 caracteres'
      });
    }

    console.log(`🤖 Usuario ${req.userId} (${userRole}) solicita interpretación de IA:`, prompt);

    // Interpretar el prompt con OpenAI
    const interpretation = await openaiService.interpretYerbaRequest(prompt, userRole);

    // Registrar el uso para estadísticas (opcional)
    console.log(`✅ Interpretación exitosa para usuario ${req.userId}:`, {
      marca: interpretation.interpretation.marca,
      tipo: interpretation.interpretation.tipo,
      pais: interpretation.interpretation.pais,
      tokensUsed: interpretation.usage.totalTokens
    });

    res.json({
      success: true,
      data: interpretation,
      userInfo: {
        userId: req.userId,
        role: userRole
      }
    });

  } catch (error) {
    console.error('❌ Error en /ai/interpret-yerba:', error);
    
    // Manejar errores específicos de OpenAI
    if (error.message.includes('usuarios PRO')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('API key')) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de IA temporalmente no disponible'
      });
    }

    if (error.message.includes('tokens') || error.message.includes('quota')) {
      return res.status(429).json({
        success: false,
        error: 'Límite de uso alcanzado. Intenta más tarde.',
        retryAfter: 3600 // 1 hora
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai/examples
 * Obtener ejemplos de prompts para ayudar a los usuarios
 */
router.get('/examples', authenticateToken, requireRole('pro'), (req, res) => {
  try {
    const examples = openaiService.getExamplePrompts();
    
    res.json({
      success: true,
      data: {
        examples,
        tips: [
          "Sé específico sobre tus gustos (suave, intenso, con o sin palo)",
          "Menciona el momento del día si es relevante",
          "Incluye marcas que te gustan o regiones de origen",
          "Describe el tipo de yerba (tradicional, despalada, barbacuá, etc.)",
          "Menciona si prefieres producción artesanal u orgánica"
        ],
        availableFields: [
          "Tipo (Tradicional, Suave, Despalada, Barbacuá, Compuesta, Orgánica, etc.)",
          "Contenido de palo (Sí, No)",
          "Corte de hoja (Extra fina, Fina, Media, Gruesa, Canchada)",
          "Origen geográfico (Misiones, Corrientes, etc.)",
          "País (Argentina, Brasil, Uruguay, Paraguay)",
          "Tipo de secado (Barbacuá, A cintas, Rotativo/Túnel, etc.)",
          "Tipo de estacionamiento (Natural, Acelerado/Controlado)",
          "Tiempo de estacionamiento (Sin estacionar, 3-6 meses, etc.)",
          "Producción (Industrial, Artesanal/Familiar, Orgánica certificada)"
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error en /ai/examples:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * GET /api/ai/status
 * Obtener estado del servicio de IA
 */
router.get('/status', authenticateToken, (req, res) => {
  console.log('🔍 /ai/status - req.userId:', req.userId);
  console.log('🔍 /ai/status - req.userRole:', req.userRole);
  console.log('🔍 /ai/status - req.user:', req.user);
  
  try {
    const status = openaiService.getUsageStats();
    const userRole = req.userRole || 'basic';
    
    console.log('🔍 /ai/status - userRole final:', userRole);
    
    res.json({
      success: true,
      data: {
        serviceAvailable: status.serviceEnabled,
        userRole,
        hasAccess: userRole === 'pro',
        systemVersion: status.systemPromptVersion,
        lastRequest: status.lastRequest
      }
    });

  } catch (error) {
    console.error('❌ Error en /ai/status:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/ai/recommend
 * Buscar yerbas basado en las características interpretadas por IA
 */
router.post('/recommend', authenticateToken, requireRole('pro'), async (req, res) => {
  try {
    const { characteristics } = req.body;
    const userRole = req.userRole || 'basic';

    if (!characteristics) {
      return res.status(400).json({
        success: false,
        error: 'Las características son requeridas'
      });
    }

    // Importar el modelo de yerbas
    const { Yerba } = await import('../config/yerbasModel.js');

    // Construir query de búsqueda basado en las nuevas características
    let query = {};

    // Filtrar por marca específica si se menciona
    if (characteristics.marca) {
      query.marca = characteristics.marca;
    }

    // Filtrar por tipo de yerba
    if (characteristics.tipo) {
      query.tipo = characteristics.tipo;
    }

    // Filtrar por contenido de palo
    if (characteristics.containsPalo) {
      query.containsPalo = characteristics.containsPalo === 'Sí';
    }

    // Filtrar por corte de hoja
    if (characteristics.leafCut) {
      query.leafCut = characteristics.leafCut;
    }

    // Filtrar por origen geográfico
    if (characteristics.origen) {
      query.origen = characteristics.origen;
    }

    // Filtrar por país
    if (characteristics.pais) {
      query.pais = characteristics.pais;
    }

    // Filtrar por tipo de secado
    if (characteristics.secado) {
      query.secado = characteristics.secado;
    }

    // Filtrar por tipo de estacionamiento
    if (characteristics.tipoEstacionamiento) {
      query.tipoEstacionamiento = characteristics.tipoEstacionamiento;
    }

    // Filtrar por tiempo de estacionamiento
    if (characteristics.tiempoEstacionamiento) {
      query.tiempoEstacionamiento = characteristics.tiempoEstacionamiento;
    }

    // Filtrar por tipo de producción
    if (characteristics.produccion) {
      query.produccion = characteristics.produccion;
    }

    console.log('🔍 Query construido para búsqueda de yerbas:', query);

    // Buscar yerbas que coincidan
    const yerbas = await Yerba.find(query).limit(10).sort({ puntuacion: -1 });

    // Si no hay coincidencias exactas, buscar coincidencias parciales
    if (yerbas.length === 0) {
      console.log('🔍 No se encontraron coincidencias exactas. Iniciando búsqueda flexible...');
      
      // Estrategia de búsqueda flexible por orden de prioridad
      const flexibleSearches = [
        // 1. Por tipo y país (más probable que haya coincidencias)
        { 
          query: {
            ...(characteristics.tipo && { tipo: characteristics.tipo }),
            ...(characteristics.pais && { pais: characteristics.pais })
          },
          name: 'tipo + país'
        },
        // 2. Solo por tipo (muy amplio)
        {
          query: characteristics.tipo ? { tipo: characteristics.tipo } : {},
          name: 'solo tipo'
        },
        // 3. Por país y origen
        {
          query: {
            ...(characteristics.pais && { pais: characteristics.pais }),
            ...(characteristics.origen && { origen: characteristics.origen })
          },
          name: 'país + origen'
        },
        // 4. Por contenido de palo y tipo de secado
        {
          query: {
            ...(characteristics.containsPalo !== undefined && { containsPalo: characteristics.containsPalo === 'Sí' }),
            ...(characteristics.secado && { secado: characteristics.secado })
          },
          name: 'palo + secado'
        },
        // 5. Solo por país
        {
          query: characteristics.pais ? { pais: characteristics.pais } : {},
          name: 'solo país'
        }
      ];

      let flexibleResults = [];
      let usedStrategy = null;

      // Probar cada estrategia hasta encontrar resultados
      for (const strategy of flexibleSearches) {
        if (Object.keys(strategy.query).length > 0) {
          const results = await Yerba.find(strategy.query).limit(10).sort({ puntuacion: -1 });
          console.log(`🔍 Estrategia "${strategy.name}" encontró: ${results.length} resultados`);
          
          if (results.length > 0) {
            flexibleResults = results;
            usedStrategy = strategy.name;
            break;
          }
        }
      }

      // Si aún no hay resultados, buscar las mejor puntuadas sin filtros
      if (flexibleResults.length === 0) {
        console.log('🔍 No se encontraron coincidencias con criterios específicos. Mostrando yerbas mejor puntuadas.');
        flexibleResults = await Yerba.find({}).limit(5).sort({ puntuacion: -1 });
        usedStrategy = 'mejor puntuadas (sin filtros)';
      }

      return res.json({
        success: true,
        data: {
          recommendations: flexibleResults,
          matchType: 'flexible',
          matchCriteria: characteristics,
          flexibleStrategy: usedStrategy,
          originalQuery: query,
          totalFound: flexibleResults.length,
          message: flexibleResults.length > 0 
            ? `No se encontraron coincidencias exactas, pero aquí tienes ${flexibleResults.length} yerbas similares usando la estrategia: ${usedStrategy}`
            : 'No se encontraron yerbas que coincidan con los criterios especificados'
        }
      });
    }

    res.json({
      success: true,
      data: {
        recommendations: yerbas,
        matchType: 'exact',
        matchCriteria: characteristics,
        query,
        totalFound: yerbas.length
      }
    });

  } catch (error) {
    console.error('❌ Error en /ai/recommend:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
