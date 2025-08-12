import dotenv from 'dotenv'
dotenv.config()

import './multiDB.js'
import User from './userModel.js'

const adminEmail = 'admin@mate.app'
const adminPass = 'changeme'

const existing = await User.findOne({ email: adminEmail })
if (existing) {
  console.log('⚠️  Ya existe un usuario admin con ese email.')
  process.exit()
}

const adminUser = new User({
  username: 'admin',
  nombre: 'Usuario',
  apellido: 'Admin',
  email: adminEmail,
  password: adminPass, // el hook pre('save') lo va a hashear
  fechaNacimiento: '1990-01-01',
  termosDia: 1,
  role: 'admin'
})

await adminUser.save()
console.log(`✅ Usuario Admin creado: ${adminUser.email} / ${adminPass}`)
process.exit()
