import mongoose from 'mongoose';
import User from './config/userModel.js';

async function debugActiveUsers() {
  try {
    console.log('🔍 Debug de usuarios activos...');
    
    // Fechas para hoy
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('📅 Período:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString()
    });
    
    // Pipeline para usuarios activos
    const pipeline = [
      // Desenrollar reviews
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      
      // Filtrar reviews en el período
      {
        $match: {
          'reviews.createdAt': {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      
      // Agrupar por usuario
      {
        $group: {
          _id: '$_id',
          username: { $first: '$username' },
          email: { $first: '$email' },
          reviewsCount: { $sum: 1 },
          firstReview: { $min: '$reviews.createdAt' },
          lastReview: { $max: '$reviews.createdAt' }
        }
      }
    ];
    
    console.log('\n🔍 Ejecutando pipeline de usuarios activos...');
    const activeUsers = await User.aggregate(pipeline);
    
    console.log(`📊 Usuarios activos encontrados: ${activeUsers.length}`);
    
    if (activeUsers.length > 0) {
      activeUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username || user.email || user._id}`);
        console.log(`     Reviews: ${user.reviewsCount}`);
        console.log(`     Período: ${user.firstReview.toISOString()} - ${user.lastReview.toISOString()}`);
      });
    } else {
      console.log('❌ No se encontraron usuarios activos en el período');
      
      // Verificar si hay usuarios con reviews en general
      console.log('\n🔍 Verificando usuarios con reviews (cualquier fecha)...');
      const usersWithReviews = await User.aggregate([
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
        { $match: { 'reviews': { $exists: true } } },
        {
          $group: {
            _id: '$_id',
            username: { $first: '$username' },
            reviewsCount: { $sum: 1 },
            lastReview: { $max: '$reviews.createdAt' }
          }
        },
        { $sort: { lastReview: -1 } }
      ]);
      
      console.log(`📊 Usuarios con reviews (cualquier fecha): ${usersWithReviews.length}`);
      usersWithReviews.slice(0, 5).forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.username || user._id} - ${user.reviewsCount} reviews, última: ${user.lastReview?.toISOString()}`);
      });
    }
    
    // Test del count
    console.log('\n🔍 Testando count directo...');
    const countPipeline = [
      ...pipeline,
      { $count: 'activeUsers' }
    ];
    
    const countResult = await User.aggregate(countPipeline);
    const activeUsersCount = countResult.length > 0 ? countResult[0].activeUsers : 0;
    
    console.log(`📊 Count directo: ${activeUsersCount}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugActiveUsers();
