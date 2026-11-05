import 'reflect-metadata'
import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { getConnectionToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import type { Connection } from 'mongoose'
import request from 'supertest'
import { AppModule } from '../src/app.module.js'
import { configureApp } from '../src/app.setup.js'
import { runSeed } from '../src/database/seed.js'
import { SEED_PASSWORD } from '../src/database/seed-data.js'

export const TEST_JWT_SECRET = 'segredo-de-teste'

/**
 * Banco externo opcional para os testes (ex.: um MongoDB do CI ou local).
 * Sem ele, cada arquivo de teste sobe um MongoDB em memória.
 */
export const EXTERNAL_MONGODB_URI = process.env.TEST_MONGODB_URI

export interface TestContext {
  app: INestApplication
  connection: Connection
  /** Só existe com o MongoDB em memória */
  replSet?: MongoMemoryReplSet
  /** Cliente HTTP (supertest) apontando para a API de teste */
  api: () => ReturnType<typeof request>
  /** Faz login com um usuário do seed e devolve o token */
  login: (email: string, password?: string) => Promise<string>
  close: () => Promise<void>
}

/** Mesmo servidor, banco com nome único (os arquivos de teste rodam em paralelo) */
function withDatabase(uri: string, dbName: string) {
  const url = new URL(uri)
  url.pathname = `/${dbName}`
  return url.toString()
}

/**
 * Sobe a API completa com um MongoDB em memória (replica set de 1 nó, igual ao Atlas)
 * e aplica o seed. Cada arquivo de teste chama no beforeAll e fecha no afterAll.
 */
export async function createTestApp(): Promise<TestContext> {
  const dbName = `saude-unificada-test-${randomUUID().slice(0, 8)}`
  let replSet: MongoMemoryReplSet | undefined
  if (EXTERNAL_MONGODB_URI) {
    process.env.MONGODB_URI = withDatabase(EXTERNAL_MONGODB_URI, dbName)
  } else {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
    process.env.MONGODB_URI = replSet.getUri(dbName)
  }
  process.env.JWT_SECRET = TEST_JWT_SECRET
  process.env.SWAGGER_ENABLED = 'true'

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
  const app = moduleRef.createNestApplication({ logger: false })
  configureApp(app)
  await app.init()

  const connection = app.get<Connection>(getConnectionToken())
  await runSeed(connection)

  const api = () => request(app.getHttpServer())

  async function login(email: string, password = SEED_PASSWORD) {
    const res = await api().post('/api/auth/login').send({ email, password })
    if (res.status !== 200) throw new Error(`Login de ${email} falhou: ${res.status} ${JSON.stringify(res.body)}`)
    return res.body.token as string
  }

  async function close() {
    if (!replSet) await connection.dropDatabase().catch(() => undefined)
    // Se o banco já foi derrubado (teste de indisponibilidade), não espera o Mongoose para sempre
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5000))])
    await replSet?.stop()
  }

  return { app, connection, replSet, api, login, close }
}
