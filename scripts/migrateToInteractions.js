// Script para migrar datos existentes y agregar interacciones de prueba
import mongoose from 'mongoose';
import User from '../config/userModel.js';
import { Yerba } from '../config/yerbasModel.js';
import { getAllValidNotes } from '../config/flavorNotes.js';

async function migrateToInteractionBasedSystem() {
  try {
    console.log('🚀 Migrando a sistema basado en interacciones...');

    // Conectar a la base de datos
    await mongoose.connect('mongodb://localhost:27017/nobilerde');
    console.log('✅ Conectado a MongoDB');

    // 1. Migrar notas desde shelf items a reviews
    console.log('\n📝 1. Migrando notas de shelf items a reviews...');
    
    const users = await User.find({ 'shelf.status': 'probada' });
    console.log(`📊 Encontrados ${users.length} usuarios con yerbas probadas`);

    let reviewsCreated = 0;
    let reviewsUpdated = 0;

    for (const user of users) {
      for (const shelfItem of user.shelf) {
        if (shelfItem.status === 'probada' && shelfItem.notes && shelfItem.notes.length > 0) {
          console.log(`🔍 Procesando item con yerba ID: ${shelfItem.yerba}`);
          
          const yerba = await Yerba.findById(shelfItem.yerba);
          if (!yerba) {
            console.log(`❌ Yerba no encontrada: ${shelfItem.yerba}`);
            continue;
          }
          
          console.log(`✅ Yerba encontrada: ${yerba.nombre}`);
          console.log(`📝 Reviews tipo: ${typeof yerba.reviews}, array: ${Array.isArray(yerba.reviews)}, length: ${yerba.reviews ? yerba.reviews.length : 'undefined'}`);
          
          // Asegurar que reviews esté inicializado
          if (!yerba.reviews) {
            console.log(`⚠️ Inicializando reviews para yerba ${yerba.nombre}`);
            yerba.reviews = [];
            await yerba.save();
          }

          // Buscar review existente del usuario
          let existingReview = yerba.reviews.find(r => r.user.toString() === user._id.toString());
          
          if (existingReview) {
            // Actualizar review existente con notas
            if (!existingReview.notes || existingReview.notes.length === 0) {
              existingReview.notes = shelfItem.notes;
              if (!existingReview.likes) existingReview.likes = [];
              if (!existingReview.replies) existingReview.replies = [];
              shelfItem.reviewId = existingReview._id;
              reviewsUpdated++;
            }
          } else {
            // Crear nuevo review
            const newReview = {
              user: user._id,
              score: shelfItem.score || 3,
              comment: shelfItem.comment || '',
              notes: shelfItem.notes,
              likes: [],
              replies: [],
              createdAt: shelfItem.addedAt || new Date()
            };
            
            yerba.reviews.push(newReview);
            shelfItem.reviewId = yerba.reviews[yerba.reviews.length - 1]._id;
            reviewsCreated++;
          }

          await yerba.save();
        }
      }
      await user.save();
    }

    console.log(`✅ Reviews creados: ${reviewsCreated}`);
    console.log(`✅ Reviews actualizados: ${reviewsUpdated}`);

    // 2. Agregar interacciones de prueba (likes y respuestas)
    console.log('\n👍 2. Agregando interacciones de prueba...');
    
    const yerbas = await Yerba.find({ 'reviews.0': { $exists: true } });
    console.log(`📊 Encontradas ${yerbas.length} yerbas con reviews`);

    let likesAdded = 0;
    let repliesAdded = 0;

    for (const yerba of yerbas) {
      // Asegurar que reviews esté definido y sea un array
      if (!yerba.reviews || !Array.isArray(yerba.reviews)) {
        console.log(`⚠️ Yerba ${yerba.nombre} no tiene reviews válidos, saltando...`);
        continue;
      }
      
      console.log(`📝 Procesando ${yerba.reviews.length} reviews de ${yerba.nombre}`);
      
      for (const review of yerba.reviews) {
        // Asegurar que el review tenga las propiedades necesarias
        if (!review.likes) review.likes = [];
        if (!review.replies) review.replies = [];
        
        // Agregar likes aleatorios (0-3 likes por review)
        const numLikes = Math.floor(Math.random() * 4);
        const allUsers = await User.find().limit(10); // Limitar para eficiencia
        
        for (let i = 0; i < numLikes && i < allUsers.length; i++) {
          const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
          if (!review.likes.includes(randomUser._id) && !review.user.equals(randomUser._id)) {
            review.likes.push(randomUser._id);
            likesAdded++;
          }
        }

        // Agregar respuestas aleatorias (0-2 respuestas por review)
        const numReplies = Math.floor(Math.random() * 3);
        const replyTexts = [
          '¡Totalmente de acuerdo!',
          'Muy buena descripción, gracias',
          'Interesante perspectiva',
          'No había notado eso, lo probaré',
          'Excelente review',
          'Me ayudó mucho tu comentario'
        ];

        for (let i = 0; i < numReplies && i < allUsers.length; i++) {
          const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
          if (!review.user.equals(randomUser._id)) {
            const randomText = replyTexts[Math.floor(Math.random() * replyTexts.length)];
            
            const newReply = {
              user: randomUser._id,
              comment: randomText,
              likes: [],
              createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
            };

            // Agregar likes aleatorios a la respuesta (0-2 likes)
            const replyLikes = Math.floor(Math.random() * 3);
            for (let j = 0; j < replyLikes && j < allUsers.length; j++) {
              const likeUser = allUsers[Math.floor(Math.random() * allUsers.length)];
              if (!newReply.likes.includes(likeUser._id) && !newReply.user.equals(likeUser._id)) {
                newReply.likes.push(likeUser._id);
              }
            }

            review.replies.push(newReply);
            repliesAdded++;
          }
        }
      }

      await yerba.save();
    }

    console.log(`✅ Likes agregados: ${likesAdded}`);
    console.log(`✅ Respuestas agregadas: ${repliesAdded}`);

    // 3. Verificar resultados
    console.log('\n📊 3. Verificando resultados...');
    
    const reviewsWithInteractions = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          review: '$reviews',
          likesCount: { 
            $cond: { 
              if: { $isArray: '$reviews.likes' }, 
              then: { $size: '$reviews.likes' }, 
              else: 0 
            } 
          },
          repliesCount: { 
            $cond: { 
              if: { $isArray: '$reviews.replies' }, 
              then: { $size: '$reviews.replies' }, 
              else: 0 
            } 
          },
          notesCount: { 
            $cond: { 
              if: { $isArray: '$reviews.notes' }, 
              then: { $size: '$reviews.notes' }, 
              else: 0 
            } 
          }
        }
      },
      {
        $match: {
          $and: [
            { review: { $exists: true } },
            {
              $or: [
                { likesCount: { $gt: 0 } },
                { repliesCount: { $gt: 0 } },
                { notesCount: { $gt: 0 } }
              ]
            }
          ]
        }
      },
      { $count: 'total' }
    ]);

    const totalInteractiveReviews = reviewsWithInteractions[0]?.total || 0;
    console.log(`📈 Reviews con interacciones: ${totalInteractiveReviews}`);

    // Estadísticas de notas más populares
    const topNotes = await Yerba.aggregate([
      { $unwind: { path: '$reviews', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$reviews.notes', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'reviews.notes': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$reviews.notes',
          count: { $sum: 1 },
          avgLikes: { 
            $avg: { 
              $cond: { 
                if: { $isArray: '$reviews.likes' }, 
                then: { $size: '$reviews.likes' }, 
                else: 0 
              } 
            } 
          },
          avgReplies: { 
            $avg: { 
              $cond: { 
                if: { $isArray: '$reviews.replies' }, 
                then: { $size: '$reviews.replies' }, 
                else: 0 
              } 
            } 
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log('\n🏆 Top 5 notas más mencionadas:');
    topNotes.forEach((note, index) => {
      console.log(`${index + 1}. ${note._id}: ${note.count} menciones (${note.avgLikes.toFixed(1)} likes avg, ${note.avgReplies.toFixed(1)} respuestas avg)`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Ejecutar
migrateToInteractionBasedSystem();
