// test_eventos_hoy.js - Script para verificar eventos de hoy
import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';

async function testEventosHoy() {
  try {
    console.log('🔍 Verificando eventos de hoy...');
    
    // Fechas para el día de hoy (UTC)
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    
    console.log('📅 Rango de fechas:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });

    // 1. Verificar reviews de hoy
    console.log('\n📝 Verificando reviews de hoy...');
    const reviewsAggregate = await Yerba.aggregate([
      { $unwind: '$reviews' },
      { 
        $match: {
          'reviews.createdAt': { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $project: {
          _id: 1,
          nombre: 1,
          'reviews.user': 1,
          'reviews.createdAt': 1,
          'reviews.comment': 1
        }
      }
    ]);
    
    console.log(`📊 Reviews encontrados: ${reviewsAggregate.length}`);
    reviewsAggregate.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.nombre} - ${item.reviews.createdAt.toISOString()} - User: ${item.reviews.user}`);
    });

    // 2. Verificar respuestas de hoy
    console.log('\n💬 Verificando respuestas de hoy...');
    const repliesAggregate = await Yerba.aggregate([
      { $unwind: '$reviews' },
      { $unwind: '$reviews.replies' },
      { 
        $match: {
          'reviews.replies.createdAt': { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $project: {
          _id: 1,
          nombre: 1,
          'reviews.replies.user': 1,
          'reviews.replies.createdAt': 1,
          'reviews.replies.comment': 1
        }
      }
    ]);
    
    console.log(`📊 Respuestas encontradas: ${repliesAggregate.length}`);
    repliesAggregate.forEach((item, i) => {
      console.log(`  ${i+1}. ${item.nombre} - ${item.reviews.replies.createdAt.toISOString()} - User: ${item.reviews.replies.user}`);
      console.log(`     Comentario: ${item.reviews.replies.comment.substring(0, 50)}...`);
    });

    // 3. Verificar items del shelf de hoy
    console.log('\n🏷️ Verificando items del shelf de hoy...');
    const users = await User.find({
      'shelf.addedAt': {
        $gte: startOfDay,
        $lte: endOfDay
      },
      'shelf.status': 'probada'
    });

    let shelfEvents = 0;
    users.forEach(user => {
      if (user.shelf) {
        const eventsInPeriod = user.shelf.filter(item => {
          const fecha = new Date(item.addedAt);
          return item.status === 'probada' && fecha >= startOfDay && fecha <= endOfDay;
        });
        shelfEvents += eventsInPeriod.length;
        if (eventsInPeriod.length > 0) {
          console.log(`  Usuario ${user._id}: ${eventsInPeriod.length} items probados`);
        }
      }
    });
    
    console.log(`📊 Items shelf encontrados: ${shelfEvents}`);

    // 4. Total
    const totalEventos = reviewsAggregate.length + repliesAggregate.length + shelfEvents;
    console.log(`\n📊 TOTAL EVENTOS HOY: ${totalEventos}`);
    console.log(`  - Reviews: ${reviewsAggregate.length}`);
    console.log(`  - Respuestas: ${repliesAggregate.length}`);
    console.log(`  - Items shelf: ${shelfEvents}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEventosHoy();
