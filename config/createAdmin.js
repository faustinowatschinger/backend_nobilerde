import dotenv from 'dotenv'
dotenv.config()

import './multiDB.js'
import User from './userModel.js'

const adminEmail = 'admin@mate.app'
const adminPass = 'changeme'

const existing = await User.findOne({ email: adminEmail })
if (existing) {
  console.log('⚠️  Ya existe un admin con ese email.')
  process.exit()
}

const admin = new User({
  username: 'admin',
  nombre: 'Administrador',
  apellido: 'Sistema',
  email: adminEmail,
  password: adminPass, // el hook pre('save') lo va a hashear
  fechaNacimiento: '1990-01-01',
  termosDia: 1,
  role: 'admin'
})

await admin.save()
console.log(`✅ Admin creado: ${admin.email} / ${adminPass}`)
process.exit()
