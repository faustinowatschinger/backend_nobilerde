// Test script para verificar las notas sensoriales
import mongoose from 'mongoose';
import User from '../config/userModel.js';
import { NOTE_TRANSLATIONS } from '../config/flavorNotes.js';

async function testNotesAggregation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nobilerde');
    console.log('✅ Conectado a MongoDB');

    // Pipeline para obtener las notas más frecuentes
    const pipeline = [
      { $unwind: '$shelf' },
      { 
        $match: { 
          'shelf.status': 'probada', 
          'shelf.notes': { $exists: true, $ne: [] } 
        } 
      },
      { $unwind: '$shelf.notes' },
      { 
        $group: { 
          _id: '$shelf.notes', 
          count: { $sum: 1 },
          users: { $addToSet: '$_id' }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ];

    const result = await User.aggregate(pipeline);
    
    console.log('\n📊 Top 10 notas más frecuentes:');
    result.forEach((item, index) => {
      const translated = NOTE_TRANSLATIONS[item._id] || item._id;
      const userCount = item.users.length;
      console.log(`${index + 1}. ${translated} - ${item.count} menciones (${userCount} usuarios)`);
    });

    // Verificar total de evaluaciones con notas
    const totalEvaluations = await User.aggregate([
      { $unwind: '$shelf' },
      { 
        $match: { 
          'shelf.status': 'probada', 
          'shelf.notes': { $exists: true, $ne: [] } 
        } 
      },
      { $count: 'total' }
    ]);

    console.log(`\n📈 Total de evaluaciones con notas: ${totalEvaluations[0]?.total || 0}`);

    await mongoose.disconnect();
    console.log('✅ Desconectado');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testNotesAggregation();
