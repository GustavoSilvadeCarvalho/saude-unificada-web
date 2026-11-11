import 'reflect-metadata'
import { readFileSync } from 'node:fs'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { OpenAPIObject } from '@nestjs/swagger'
import { AppModule } from '../src/app.module.js'
import { API_PREFIX } from '../src/app.setup.js'
import { buildOpenApiDocument } from '../src/swagger.js'

// Não precisa de banco: o modo "preview" monta os controllers sem conectar no MongoDB.

/** Rotas abertas (sem token). Toda rota fora desta lista precisa de @ApiBearerAuth() */
const PUBLIC_ROUTES = [
  'POST /api/auth/login',
  'POST /api/auth/patient-login',
  'POST /api/auth/patient-register',
  'GET /api/health',
  'GET /api/health/live',
  'GET /api/verify/{code}',
]

type Operation = {
  summary?: string
  tags?: string[]
  security?: unknown[]
  responses: Record<string, unknown>
}

function operations(document: OpenAPIObject) {
  return Object.entries(document.paths).flatMap(([path, item]) =>
    Object.entries(item as Record<string, Operation>).map(([method, op]) => ({
      route: `${method.toUpperCase()} ${path}`,
      op,
    })),
  )
}

describe('Documentação Swagger', () => {
  let document: OpenAPIObject
  let warnings: string[]

  beforeAll(async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined)
    const app = await NestFactory.create(AppModule, { preview: true, logger: false })
    app.setGlobalPrefix(API_PREFIX)
    document = buildOpenApiDocument(app)
    warnings = warn.mock.calls.map(([message]) => String(message))
    warn.mockRestore()
    await app.close()
  })

  it('gera a documentação sem avisos (ex.: duas classes de resposta com o mesmo nome)', () => {
    expect(warnings).toEqual([])
  })

  it('documenta as rotas implementadas', () => {
    const routes = operations(document).map((o) => o.route)
    expect(routes).toEqual(
      expect.arrayContaining([
        'POST /api/auth/login',
        'GET /api/auth/me',
        'GET /api/health',
        'GET /api/health/live',
  'GET /api/verify/{code}',
        'GET /api/patients/{cpf}',
        'POST /api/patients',
        'GET /api/appointments',
        'POST /api/appointments',
        'POST /api/appointments/{id}/documents',
        'GET /api/appointments/{id}/documents/{documentId}/download',
        'GET /api/regions',
        'GET /api/regional-data',
        'POST /api/auth/patient-login',
        'POST /api/auth/patient-register',
        'GET /api/me/record',
        'GET /api/me/appointments',
        'GET /api/me/exams',
        'GET /api/me/access-log',
        'GET /api/me/appointments/{id}/documents/{documentId}/download',
      ]),
    )
  })

  it('toda rota tem resumo, tag e uma resposta de sucesso documentada', () => {
    for (const { route, op } of operations(document)) {
      expect(op.summary, `${route} sem @ApiOperation`).toBeTruthy()
      expect(op.tags?.length, `${route} sem @ApiTags`).toBeGreaterThan(0)
      const success = Object.keys(op.responses).some((status) => status.startsWith('2'))
      expect(success, `${route} sem resposta 2xx documentada`).toBe(true)
    }
  })

  it('toda rota protegida pede o token (Bearer) e as públicas não', () => {
    for (const { route, op } of operations(document)) {
      const hasBearer = (op.security ?? []).some((s) => Object.hasOwn(s as object, 'bearer'))
      expect(hasBearer, `${route}: confira @ApiBearerAuth() / PUBLIC_ROUTES`).toBe(!PUBLIC_ROUTES.includes(route))
    }
  })

  it('docs/openapi.json está atualizado (se falhar, rode: npm run openapi)', () => {
    const saved = JSON.parse(readFileSync(new URL('../../docs/openapi.json', import.meta.url), 'utf8'))
    expect(saved).toEqual(JSON.parse(JSON.stringify(document)))
  })
})
