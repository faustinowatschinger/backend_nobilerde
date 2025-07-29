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
  email: adminEmail,
  password: adminPass, // el hook pre('save') lo va a hashear
  role: 'admin'
})

await admin.save()
console.log(`✅ Admin creado: ${admin.email} / ${adminPass}`)
process.exit()
