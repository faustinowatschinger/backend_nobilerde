import dotenv from 'dotenv'
dotenv.config()

import './multiDB.js'
import User from './userModel.js'

// Obtener argumentos de línea de comandos
const args = process.argv.slice(2)
const role = args[0] || 'user' // rol por defecto
const email = args[1] || `${role}@mate.app`
const password = args[2] || 'changeme'

// Validar que el rol sea válido
if (!['user', 'pro', 'admin'].includes(role)) {
  console.log('❌ Rol inválido. Debe ser: user, pro, o admin')
  process.exit(1)
}

const existing = await User.findOne({ email })
if (existing) {
  console.log(`⚠️  Ya existe un usuario con el email: ${email}`)
  process.exit(1)
}

const userData = {
  username: role === 'admin' ? 'admin' : `${role}_user`,
  nombre: role === 'admin' ? 'Administrador' : role === 'pro' ? 'Usuario Pro' : 'Usuario',
  apellido: role === 'admin' ? 'Sistema' : 'Básico',
  email,
  password, // el hook pre('save') lo va a hashear
  fechaNacimiento: '1990-01-01',
  termosDia: 1,
  role
}

const newUser = new User(userData)
await newUser.save()

console.log(`✅ Usuario ${role} creado:`)
console.log(`   Email: ${newUser.email}`)
console.log(`   Password: ${password}`)
console.log(`   Rol: ${newUser.role}`)

process.exit()
