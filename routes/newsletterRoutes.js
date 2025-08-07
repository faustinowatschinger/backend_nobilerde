import express from 'express';
import { authenticateToken } from '../auth/middleware/authMiddleware.js';
import { Newsletter } from '../config/newsletterModel.js';

const router = express.Router();

// Ruta para suscribirse al newsletter (sin autenticación)
router.post('/newsletter', async (req, res) => {
  try {
    const { email, source } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Formato de email inválido'
      });
    }
    
    const emailLower = email.toLowerCase().trim();
    
    // Verificar si ya está suscrito
    const existingSubscriber = await Newsletter.findOne({ email: emailLower });
    
    if (existingSubscriber) {
      if (existingSubscriber.active) {
        console.log(`📧 Email ya suscrito: ${emailLower}`);
        return res.json({
          success: true,
          message: 'Ya estás suscrito a nuestro newsletter',
          alreadySubscribed: true
        });
      } else {
        // Reactivar suscripción
        existingSubscriber.active = true;
        existingSubscriber.subscribedAt = new Date();
        existingSubscriber.unsubscribedAt = undefined;
        await existingSubscriber.save();
        
        console.log(`🔄 Reactivado suscriptor: ${emailLower}`);
        return res.json({
          success: true,
          message: 'Te suscribiste exitosamente al newsletter',
          reactivated: true
        });
      }
    }
    
    // Crear nuevo suscriptor
    const newSubscriber = new Newsletter({
      email: emailLower,
      source: source || 'landing-page',
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    });
    
    await newSubscriber.save();
    
    console.log(`✅ Nuevo suscriptor: ${emailLower}`);
    
    res.json({
      success: true,
      message: 'Te suscribiste exitosamente al newsletter',
      email: emailLower
    });
    
  } catch (error) {
    console.error('❌ Error en newsletter:', error);
    
    if (error.code === 11000) {
      // Error de duplicado (por si acaso)
      return res.json({
        success: true,
        message: 'Ya estás suscrito a nuestro newsletter',
        alreadySubscribed: true
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Ruta para obtener estadísticas (solo para admins)
router.get('/newsletter/stats', authenticateToken, async (req, res) => {
  try {
    // Solo permitir a admins
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado'
      });
    }
    
    const totalSubscribers = await Newsletter.countDocuments();
    const activeSubscribers = await Newsletter.countDocuments({ active: true });
    
    // Estadísticas por fuente
    const sourceStats = await Newsletter.aggregate([
      { $match: { active: true } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Estadísticas por fecha (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dateStats = await Newsletter.aggregate([
      { $match: { subscribedAt: { $gte: thirtyDaysAgo }, active: true } },
      { 
        $group: { 
          _id: { 
            $dateToString: { format: '%Y-%m-%d', date: '$subscribedAt' } 
          }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Suscriptores recientes
    const recentSubscribers = await Newsletter.find({ active: true })
      .sort({ subscribedAt: -1 })
      .limit(10)
      .select('email source subscribedAt');
    
    res.json({
      success: true,
      stats: {
        total: totalSubscribers,
        active: activeSubscribers,
        inactive: totalSubscribers - activeSubscribers,
        bySource: sourceStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byDate: dateStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        recent: recentSubscribers
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo stats de newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Ruta para exportar suscriptores (solo para admins)
router.get('/newsletter/export', authenticateToken, async (req, res) => {
  try {
    // Solo permitir a admins
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado'
      });
    }
    
    const subscribers = await Newsletter.find({ active: true })
      .sort({ subscribedAt: -1 })
      .select('email source subscribedAt');
    
    // Generar CSV
    const csvHeader = 'email,source,subscribedAt\n';
    const csvRows = subscribers.map(sub => 
      `${sub.email},${sub.source},${sub.subscribedAt.toISOString()}`
    ).join('\n');
    
    const csv = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="nobilerde-newsletter.csv"');
    res.send(csv);
    
  } catch (error) {
    console.error('❌ Error exportando newsletter:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Ruta para desuscribirse (opcional)
router.post('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email es requerido'
      });
    }
    
    const emailLower = email.toLowerCase().trim();
    
    const subscriber = await Newsletter.findOne({ email: emailLower });
    
    if (subscriber && subscriber.active) {
      subscriber.active = false;
      subscriber.unsubscribedAt = new Date();
      await subscriber.save();
      
      console.log(`📧 Usuario desuscrito: ${emailLower}`);
      
      res.json({
        success: true,
        message: 'Te desuscribiste exitosamente'
      });
    } else {
      res.json({
        success: true,
        message: 'Email no encontrado en la lista o ya desuscrito'
      });
    }
    
  } catch (error) {
    console.error('❌ Error desuscribiendo:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

export default router;
