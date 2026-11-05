import 'reflect-metadata'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import mongoose, { type Connection, type Model, type Schema } from 'mongoose'
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema.js'
import { loadEnvFile } from '../common/env.js'
import { Patient, PatientSchema } from '../patients/patient.schema.js'
import { User, UserSchema } from '../users/user.schema.js'
import { SEED_PASSWORD, seedPatients, seedUsers } from './seed-data.js'

/**
 * Reaproveita o model se a conexão já tiver um (caso dos testes, que usam a conexão do Nest).
 * Sem genéricos de propósito: os tipos do Mongoose com genérico estouram a memória do tsc.
 */
function getModel(connection: Connection, name: string, schema: Schema): Model<any> {
  return connection.models[name] ?? (connection.model(name, schema) as unknown as Model<any>)
}

/**
 * Limpa as coleções e insere os dados de teste.
 * Usado pelo `npm run seed`, pelo `npm run dev:memory` e pelos testes e2e.
 */
export async function runSeed(connection: Connection) {
  const userModel = getModel(connection, User.name, UserSchema)
  const patientModel = getModel(connection, Patient.name, PatientSchema)
  const auditModel = getModel(connection, AuditLog.name, AuditLogSchema)
  // Garante os índices (ex.: e-mail e CPF únicos) antes de inserir
  await Promise.all([userModel.init(), patientModel.init(), auditModel.init()])

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  await userModel.deleteMany({})
  await userModel.insertMany(seedUsers.map((user) => ({ ...user, passwordHash })))

  await patientModel.deleteMany({})
  await patientModel.insertMany(seedPatients)

  // A trilha de auditoria começa vazia a cada seed
  await auditModel.deleteMany({})

  return { users: seedUsers.length, patients: seedPatients.length }
}

// Execução direta: npm run seed (usa o MONGODB_URI do .env)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  loadEnvFile()
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Defina MONGODB_URI no .env antes de rodar o seed.')
    process.exit(1)
  }
  const connection = await mongoose.createConnection(uri).asPromise()
  try {
    const result = await runSeed(connection)
    console.log(
      `Seed concluído: ${result.users} usuários (senha de todos: ${SEED_PASSWORD}) e ${result.patients} pacientes.`,
    )
  } finally {
    await connection.close()
  }
}
