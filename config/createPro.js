import dotenv from 'dotenv'
dotenv.config()

import './multiDB.js'
import User from './userModel.js'

const proEmail = 'pro@mate.app'
const proPass = 'changeme'

const existing = await User.findOne({ email: proEmail })
if (existing) {
  console.log('⚠️  Ya existe un usuario pro con ese email.')
  process.exit()
}

const proUser = new User({
  username: 'pro',
  nombre: 'Usuario',
  apellido: 'Pro',
  email: proEmail,
  password: proPass, // el hook pre('save') lo va a hashear
  fechaNacimiento: '1990-01-01',
  termosDia: 1,
  role: 'pro'
})

await proUser.save()
console.log(`✅ Usuario Pro creado: ${proUser.email} / ${proPass}`)
process.exit()
