const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Create connection to yerbas database
const yerbasConn = mongoose.createConnection(process.env.MONGODB_URI_YERBAS);

// Import the Yerba model
const { Schema } = mongoose;
const yerbasSchema = new Schema({
  nombre: String,
  marca: String,
  establecimiento: String,
  tipo: String,
  containsPalo: Schema.Types.Mixed, // Allow both string and boolean
  leafCut: String,
  origen: String,
  pais: String,
  secado: String,
  tipoEstacionamiento: String,
  tiempoEstacionamiento: String,
  produccion: String,
  composicion: [String],
  imagenURL: String,
  affiliateLink: String,
  ean: Number,
  reviews: [Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Yerba = yerbasConn.model('Yerba', yerbasSchema);

setTimeout(async () => {
  try {
    console.log('🔄 Converting containsPalo from strings to booleans...');
    
    // Update "Sí" to true
    const updateSi = await Yerba.updateMany(
      { containsPalo: 'Sí' },
      { $set: { containsPalo: true } }
    );
    console.log(`✅ Updated ${updateSi.modifiedCount} yerbas from "Sí" to true`);
    
    // Update "No" to false
    const updateNo = await Yerba.updateMany(
      { containsPalo: 'No' },
      { $set: { containsPalo: false } }
    );
    console.log(`✅ Updated ${updateNo.modifiedCount} yerbas from "No" to false`);
    
    // Also populate some missing fields with sample data for testing
    console.log('\\n🔄 Adding sample data to missing fields...');
    
    const yerbas = await Yerba.find({}).limit(20);
    
    const establishments = ['Tradicional', 'Boutique', 'Artesanal', 'Industrial', 'Familiar'];
    const parkingTypes = ['Natural', 'Artificial', 'Mixto'];
    const productions = ['Orgánica', 'Convencional', 'Sustentable'];
    
    for (let i = 0; i < yerbas.length; i++) {
      const yerba = yerbas[i];
      const updates = {};
      
      if (!yerba.establecimiento) {
        updates.establecimiento = establishments[i % establishments.length];
      }
      if (!yerba.tipoEstacionamiento) {
        updates.tipoEstacionamiento = parkingTypes[i % parkingTypes.length];
      }
      if (!yerba.produccion) {
        updates.produccion = productions[i % productions.length];
      }
      
      if (Object.keys(updates).length > 0) {
        await Yerba.findByIdAndUpdate(yerba._id, { $set: updates });
        console.log(`Updated ${yerba.nombre || yerba._id}: ${JSON.stringify(updates)}`);
      }
    }
    
    // Check final state
    console.log('\\n📊 Final distribution:');
    const paloStats = await Yerba.aggregate([
      { $group: { _id: '$containsPalo', count: { $sum: 1 } } }
    ]);
    console.log('ContainsPalo:', paloStats);
    
    const estStats = await Yerba.aggregate([
      { $group: { _id: '$establecimiento', count: { $sum: 1 } } }
    ]);
    console.log('Establecimiento:', estStats);
    
    const parkStats = await Yerba.aggregate([
      { $group: { _id: '$tipoEstacionamiento', count: { $sum: 1 } } }
    ]);
    console.log('TipoEstacionamiento:', parkStats);
    
    const prodStats = await Yerba.aggregate([
      { $group: { _id: '$produccion', count: { $sum: 1 } } }
    ]);
    console.log('Produccion:', prodStats);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}, 1000);
