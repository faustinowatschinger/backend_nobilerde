const mongoose = require('mongoose');
require('./config/database');
const Yerba = require('./models/Yerba');

setTimeout(async () => {
  try {
    const yerbas = await Yerba.find({}).limit(10);
    console.log('Sample yerbas (first 10):');
    yerbas.forEach((yerba, i) => {
      console.log(`${i+1}. ${yerba.name}`);
      console.log(`   containsPalo: ${yerba.containsPalo}`);
      console.log(`   establishment: ${yerba.establishment}`);
      console.log(`   leafCut: ${yerba.leafCut}`);
      console.log(`   parkingType: ${yerba.parkingType}`);
      console.log(`   production: ${yerba.production}`);
      console.log('   ---');
    });
    
    console.log('\nContainsPalo distribution:');
    const paloStats = await Yerba.aggregate([
      { $group: { _id: '$containsPalo', count: { $sum: 1 } } }
    ]);
    console.log(paloStats);
    
    console.log('\nEstablishment distribution:');
    const estStats = await Yerba.aggregate([
      { $group: { _id: '$establishment', count: { $sum: 1 } } }
    ]);
    console.log(estStats.slice(0, 5));
    
    console.log('\nLeafCut distribution:');
    const leafStats = await Yerba.aggregate([
      { $group: { _id: '$leafCut', count: { $sum: 1 } } }
    ]);
    console.log(leafStats.slice(0, 5));
    
    console.log('\nTotal yerbas:', await Yerba.countDocuments());
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}, 1000);
