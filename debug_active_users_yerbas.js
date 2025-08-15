import mongoose from 'mongoose';
import { Yerba } from './config/yerbasModel.js';

async function debugActiveUsersFromYerbas() {
  try {
    console.log('🔍 Debug de usuarios activos desde yerbas...');
    
    // Fechas para hoy
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('📅 Período:', {
      start: todayStart.toISOString(),
      end: todayEnd.toISOString()
    });
    
    // Verificar yerbas con reviews en general
    console.log('\n🔍 Verificando yerbas con reviews (cualquier fecha)...');
    const yerbasWithReviews = await Yerba.find({ 
      'reviews.0': { $exists: true } 
    }).select('nombre marca reviews').limit(5);
    
    console.log(`📊 Yerbas con reviews: ${yerbasWithReviews.length}`);
    yerbasWithReviews.forEach((yerba, index) => {
      console.log(`  ${index + 1}. ${yerba.marca} ${yerba.nombre} - ${yerba.reviews.length} reviews`);
      if (yerba.reviews.length > 0) {
        const lastReview = yerba.reviews[yerba.reviews.length - 1];
        console.log(`     Última review: ${lastReview.createdAt?.toISOString()}, Usuario: ${lastReview.user}`);
      }
    });
    
    // Pipeline para usuarios activos HOY
    console.log('\n🔍 Ejecutando pipeline de usuarios activos HOY...');
    const pipeline = [
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
      {
        $match: {
          'reviews.createdAt': {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: '$reviews.user',
          reviewsCount: { $sum: 1 },
          yerbas: { $addToSet: { nombre: '$nombre', marca: '$marca' } },
          firstReview: { $min: '$reviews.createdAt' },
          lastReview: { $max: '$reviews.createdAt' }
        }
      }
    ];
    
    const activeUsersDetailed = await Yerba.aggregate(pipeline);
    console.log(`📊 Usuarios activos HOY: ${activeUsersDetailed.length}`);
    
    if (activeUsersDetailed.length > 0) {
      activeUsersDetailed.forEach((user, index) => {
        console.log(`  ${index + 1}. Usuario ${user._id}`);
        console.log(`     Reviews: ${user.reviewsCount}`);
        console.log(`     Yerbas: ${user.yerbas.map(y => `${y.marca} ${y.nombre}`).join(', ')}`);
        console.log(`     Período: ${user.firstReview.toISOString()} - ${user.lastReview.toISOString()}`);
      });
    } else {
      console.log('❌ No hay usuarios activos HOY');
      
      // Verificar reviews de los últimos días
      console.log('\n🔍 Verificando reviews de los últimos 7 días...');
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const recentReviews = await Yerba.aggregate([
        { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            'reviews.createdAt': { $gte: weekAgo }
          }
        },
        {
          $group: {
            _id: '$reviews.user',
            reviewsCount: { $sum: 1 },
            lastReview: { $max: '$reviews.createdAt' }
          }
        },
        { $sort: { lastReview: -1 } }
      ]);
      
      console.log(`📊 Usuarios activos últimos 7 días: ${recentReviews.length}`);
      recentReviews.slice(0, 5).forEach((user, index) => {
        console.log(`  ${index + 1}. Usuario ${user._id} - ${user.reviewsCount} reviews, última: ${user.lastReview?.toISOString()}`);
      });
    }
    
    // Test del count
    console.log('\n🔍 Testando count directo...');
    const countPipeline = [
      ...pipeline,
      { $count: 'activeUsers' }
    ];
    
    const countResult = await Yerba.aggregate(countPipeline);
    const activeUsersCount = countResult.length > 0 ? countResult[0].activeUsers : 0;
    
    console.log(`📊 Count directo: ${activeUsersCount}`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugActiveUsersFromYerbas();
