import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../auth/middleware/authMiddleware.js';
import { Yerba } from '../config/yerbasModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ruta para obtener recomendaciones del usuario autenticado
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId; // ID del usuario autenticado desde el middleware
    console.log(`🚀 Generando recomendaciones para usuario: ${userId}`);

    // Ruta al script de IA
    const aiScriptPath = path.join(__dirname, '../../ai-engine/pipeline_completo.py');
    
    // Ejecutar el pipeline de IA con el userId
    const pythonProcess = spawn('python', [aiScriptPath, userId], {
      cwd: path.join(__dirname, '../../ai-engine'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('✅ Pipeline de IA ejecutado exitosamente');
        
        // Parsear las recomendaciones del output
        try {
          // Buscar la línea que contiene JSON_RECOMMENDATIONS
          const lines = outputData.split('\n');
          let recommendationsData = [];
          
          // Buscar el inicio del JSON y reconstruir la línea completa
          let jsonStartIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('JSON_RECOMMENDATIONS:')) {
              jsonStartIndex = i;
              break;
            }
          }
          
          if (jsonStartIndex !== -1) {
            // Reconstruir el JSON completo desde múltiples líneas si es necesario
            let jsonStr = lines[jsonStartIndex].replace('JSON_RECOMMENDATIONS:', '').trim();
            
            // Si el JSON no termina con ], continuar con las siguientes líneas
            let lineIndex = jsonStartIndex + 1;
            while (!jsonStr.endsWith(']') && lineIndex < lines.length) {
              jsonStr += lines[lineIndex].trim();
              lineIndex++;
            }
            
            try {
              recommendationsData = JSON.parse(jsonStr);
              console.log('✅ JSON parseado exitosamente:', recommendationsData);
            } catch (jsonError) {
              console.error('❌ Error parseando JSON reconstruido:', jsonError);
              console.log('JSON reconstruido:', jsonStr);
            }
          }

          if (recommendationsData.length === 0) {
            console.log('⚠️ No se encontraron recomendaciones JSON, intentando parseo legacy...');
            // Fallback al método anterior
            let inRecommendations = false;
            for (const line of lines) {
              if (line.includes('Yerbas recomendadas:')) {
                inRecommendations = true;
                continue;
              }
              if (inRecommendations && line.match(/^\d+\./)) {
                const match = line.match(/(\d+)\.\s(.+?)\s\(Score:\s([\d.]+)\)/);
                if (match) {
                  recommendationsData.push({
                    rank: parseInt(match[1]),
                    name: match[2],
                    score: parseFloat(match[3])
                  });
                }
              }
              if (inRecommendations && line.includes('Recomendaciones generadas exitosamente')) {
                break;
              }
            }
          }

          // Buscar información completa de las yerbas si tenemos IDs
          const recommendations = [];
          for (const rec of recommendationsData) {
            if (rec.id) {
              // Buscar yerba completa por ID
              try {
                const yerba = await Yerba.findOne({ _id: rec.id }).lean();
                if (yerba) {
                  recommendations.push({
                    rank: rec.rank,
                    score: rec.score,
                    ...yerba // Incluir toda la información de la yerba
                  });
                } else {
                  console.log(`⚠️ Yerba no encontrada con ID: ${rec.id}`);
                  recommendations.push(rec); // Incluir solo datos básicos si no se encuentra
                }
              } catch (dbError) {
                console.error(`❌ Error buscando yerba ${rec.id}:`, dbError.message);
                recommendations.push(rec); // Incluir solo datos básicos si hay error
              }
            } else {
              // Sin ID, usar datos básicos
              recommendations.push(rec);
            }
          }

          console.log('✅ Recomendaciones procesadas:', recommendations.length);

          res.json({
            success: true,
            userId: userId,
            recommendations: recommendations,
            timestamp: new Date().toISOString()
          });

        } catch (parseError) {
          console.error('❌ Error parseando recomendaciones:', parseError);
          res.status(500).json({
            success: false,
            error: 'Error procesando recomendaciones',
            output: outputData
          });
        }

      } else {
        console.error('❌ Error en pipeline de IA:', errorData);
        res.status(500).json({
          success: false,
          error: 'Error ejecutando modelo de IA',
          details: errorData
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('❌ Error spawning Python process:', error);
      res.status(500).json({
        success: false,
        error: 'Error iniciando proceso de IA'
      });
    });

  } catch (error) {
    console.error('❌ Error en endpoint de recomendaciones:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
