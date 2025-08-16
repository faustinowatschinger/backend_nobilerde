const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Create connection to yerbas database
const yerbasConn = mongoose.createConnection(process.env.MONGODB_URI_YERBAS);

// Import the Yerba model
const { Schema } = mongoose;
const yerbasSchema = new Schema({
  name: String,
  brand: String,
  country: String,
  type: String,
  containsPalo: Boolean,
  establishment: String,
  leafCut: String,
  parkingType: String,
  production: String
}, { timestamps: true });

const Yerba = yerbasConn.model('Yerba', yerbasSchema);

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
