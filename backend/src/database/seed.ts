import 'reflect-metadata'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import mongoose, { type Connection, type Model } from 'mongoose'
import { loadEnvFile } from '../common/env.js'
import { User, UserSchema } from '../users/user.schema.js'
import { SEED_PASSWORD, seedUsers } from './seed-data.js'

/** Reaproveita o model se a conexão já tiver um (caso dos testes, que usam a conexão do Nest) */
function getUserModel(connection: Connection): Model<User> {
  const existing = connection.models[User.name] as Model<User> | undefined
  return existing ?? (connection.model(User.name, UserSchema) as unknown as Model<User>)
}

/**
 * Limpa as coleções e insere os dados de teste.
 * Usado pelo `npm run seed`, pelo `npm run dev:memory` e pelos testes e2e.
 */
export async function runSeed(connection: Connection) {
  const userModel = getUserModel(connection)
  await userModel.init() // garante os índices (ex.: e-mail único)

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  await userModel.deleteMany({})
  await userModel.insertMany(seedUsers.map((user) => ({ ...user, passwordHash })))

  return { users: seedUsers.length }
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
    console.log(`Seed concluído: ${result.users} usuários (senha de todos: ${SEED_PASSWORD}).`)
  } finally {
    await connection.close()
  }
}
