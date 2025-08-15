import mongoose from 'mongoose';
import User from './config/userModel.js';
import { Yerba } from './config/yerbasModel.js';

async function debugActivityToday() {
  try {
    console.log('🔍 Debug detallado de actividad HOY...');
    
    // Fechas para hoy
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('📅 Período HOY:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString()
    });
    
    // 1. Usuarios con reviews HOY
    console.log('\n🔍 1. Usuarios con reviews HOY...');
    const usersWithReviews = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'reviews.createdAt': { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$reviews.user',
          reviewsCount: { $sum: 1 },
          yerbas: { $addToSet: { nombre: '$nombre', marca: '$marca' } },
          reviews: { $push: { 
            createdAt: '$reviews.createdAt', 
            score: '$reviews.score',
            comment: '$reviews.comment'
          }}
        }
      }
    ]);
    
    console.log(`📊 Usuarios con reviews HOY: ${usersWithReviews.length}`);
    usersWithReviews.forEach((user, index) => {
      console.log(`  ${index + 1}. Usuario ${user._id}`);
      console.log(`     Reviews: ${user.reviewsCount}`);
      console.log(`     Yerbas: ${user.yerbas.map(y => `${y.marca} ${y.nombre}`).join(', ')}`);
      user.reviews.forEach((review, rIndex) => {
        console.log(`     Review ${rIndex + 1}: ${review.createdAt.toISOString()}, Score: ${review.score}, Comentario: "${review.comment || 'Sin comentario'}"`);
      });
    });
    
    // 2. Usuarios con respuestas HOY
    console.log('\n🔍 2. Usuarios con respuestas HOY...');
    const usersWithReplies = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$reviews.replies', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'reviews.replies.createdAt': { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$reviews.replies.user',
          repliesCount: { $sum: 1 },
          replies: { $push: {
            createdAt: '$reviews.replies.createdAt',
            comment: '$reviews.replies.comment',
            yerba: { nombre: '$nombre', marca: '$marca' },
            reviewUser: '$reviews.user'
          }}
        }
      }
    ]);
    
    console.log(`📊 Usuarios con respuestas HOY: ${usersWithReplies.length}`);
    usersWithReplies.forEach((user, index) => {
      console.log(`  ${index + 1}. Usuario ${user._id}`);
      console.log(`     Respuestas: ${user.repliesCount}`);
      user.replies.forEach((reply, rIndex) => {
        console.log(`     Respuesta ${rIndex + 1}: ${reply.createdAt.toISOString()}, "${reply.comment}", en ${reply.yerba.marca} ${reply.yerba.nombre}`);
      });
    });
    
    // 3. Usuarios con actividad en shelf HOY
    console.log('\n🔍 3. Usuarios con actividad en shelf HOY...');
    const usersWithShelfActivity = await User.aggregate([
      { $unwind: { path: '$shelf', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'shelf.addedAt': { $gte: todayStart, $lte: todayEnd },
          'shelf.status': 'probada'
        }
      },
      {
        $group: {
          _id: '$_id',
          username: { $first: '$username' },
          email: { $first: '$email' },
          shelfCount: { $sum: 1 },
          items: { $push: {
            yerbaId: '$shelf.yerbaId',
            addedAt: '$shelf.addedAt',
            status: '$shelf.status'
          }}
        }
      }
    ]);
    
    console.log(`📊 Usuarios con actividad en shelf HOY: ${usersWithShelfActivity.length}`);
    usersWithShelfActivity.forEach((user, index) => {
      console.log(`  ${index + 1}. Usuario ${user.username || user.email || user._id}`);
      console.log(`     Items marcados como probados: ${user.shelfCount}`);
      user.items.forEach((item, iIndex) => {
        console.log(`     Item ${iIndex + 1}: Yerba ${item.yerbaId}, añadido: ${item.addedAt.toISOString()}`);
      });
    });
    
    // 4. Resumen de usuarios únicos
    console.log('\n🔍 4. Resumen de usuarios únicos...');
    const allActiveUsers = new Set();
    
    usersWithReviews.forEach(user => allActiveUsers.add(user._id.toString()));
    usersWithReplies.forEach(user => allActiveUsers.add(user._id.toString()));
    usersWithShelfActivity.forEach(user => allActiveUsers.add(user._id.toString()));
    
    console.log(`📊 Total usuarios únicos activos HOY: ${allActiveUsers.size}`);
    console.log(`👥 IDs de usuarios activos:`, Array.from(allActiveUsers));
    
    // 5. Verificar información de usuarios
    if (allActiveUsers.size > 0) {
      console.log('\n🔍 5. Información de usuarios activos...');
      const userIds = Array.from(allActiveUsers).map(id => new mongoose.Types.ObjectId(id));
      const userInfo = await User.find({ _id: { $in: userIds } }).select('_id username email');
      
      userInfo.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username || user.email || 'Sin nombre'} (ID: ${user._id})`);
      });
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugActivityToday();
