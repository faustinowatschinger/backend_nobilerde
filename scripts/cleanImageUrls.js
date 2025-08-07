import { yerbasConn } from '../config/multiDB.js';
import { Yerba } from '../config/yerbasModel.js';

async function cleanImageUrls() {
  try {
    console.log('🧹 Limpiando URLs de imágenes en la base de datos...');
    
    // Obtener todas las yerbas
    const allYerbas = await Yerba.find({});
    console.log(`📊 Total de yerbas encontradas: ${allYerbas.length}`);
    
    let updated = 0;
    
    for (const yerba of allYerbas) {
      if (yerba.imagenURL && typeof yerba.imagenURL === 'string') {
        let originalUrl = yerba.imagenURL;
        let cleanPath = originalUrl;
        
        // Si es URL absoluta, extraer solo la parte relativa
        if (cleanPath.includes('/static/yerbas/')) {
          cleanPath = cleanPath.substring(cleanPath.indexOf('/static/'));
        }
        
        // Limpiar dobles slashes y asegurar formato correcto
        cleanPath = cleanPath.replace(/^\/+/, '/');
        
        // Solo actualizar si cambió
        if (cleanPath !== originalUrl) {
          await Yerba.updateOne(
            { _id: yerba._id },
            { imagenURL: cleanPath }
          );
          
          console.log(`✅ ${yerba.nombre}: ${originalUrl} → ${cleanPath}`);
          updated++;
        }
      }
    }
    
    console.log(`🎉 Actualizadas ${updated} yerbas`);
    
  } catch (error) {
    console.error('❌ Error limpiando URLs:', error);
  }
  
  // Cerrar conexiones
  try {
    await yerbasConn.close();
    console.log('� Conexión cerrada');
  } catch (e) {
    console.log('⚠️ Error cerrando conexión:', e.message);
  }
  
  process.exit(0);
}

cleanImageUrls();
