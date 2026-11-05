import 'reflect-metadata'
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

export interface TestContext {
  app: INestApplication
  connection: Connection
  replSet: MongoMemoryReplSet
  /** Cliente HTTP (supertest) apontando para a API de teste */
  api: () => ReturnType<typeof request>
  /** Faz login com um usuário do seed e devolve o token */
  login: (email: string, password?: string) => Promise<string>
  close: () => Promise<void>
}

/**
 * Sobe a API completa com um MongoDB em memória (replica set de 1 nó, igual ao Atlas)
 * e aplica o seed. Cada arquivo de teste chama no beforeAll e fecha no afterAll.
 */
export async function createTestApp(): Promise<TestContext> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
  process.env.MONGODB_URI = replSet.getUri('saude-unificada-test')
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
    // Se o banco já foi derrubado (teste de indisponibilidade), não espera o Mongoose para sempre
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 5000))])
    await replSet.stop()
  }

  return { app, connection, replSet, api, login, close }
}
