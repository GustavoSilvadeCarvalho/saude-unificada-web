// Sobe a API com um MongoDB em memória, sem instalar nada: npm run dev:memory
// O banco é um replica set de 1 nó (o registro de atendimento usa transação)
// e começa sempre com os dados do seed. Tudo some quando o processo para.

import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { loadEnvFile } from './common/env.js'
import { runSeed } from './database/seed.js'

loadEnvFile()
process.env.JWT_SECRET ??= 'segredo-de-desenvolvimento'

const logger = new Logger('DevMemory')
logger.log('Subindo MongoDB em memória (no primeiro uso ele baixa o binário, pode demorar)...')

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
process.env.MONGODB_URI = replSet.getUri('saude-unificada')

const connection = await mongoose.createConnection(process.env.MONGODB_URI).asPromise()
const result = await runSeed(connection)
await connection.close()
logger.log(`Seed aplicado: ${result.users} usuários (senha de todos: 123456) e ${result.patients} pacientes.`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    await replSet.stop()
    process.exit(0)
  })
}

await import('./main.js')
