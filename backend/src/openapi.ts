// Gera docs/openapi.json sem precisar de banco: npm run openapi
// O modo "preview" do Nest monta os módulos e controllers sem instanciar
// os providers, então não conecta no MongoDB.

import 'reflect-metadata'
import { mkdirSync, writeFileSync } from 'node:fs'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { API_PREFIX } from './app.setup.js'
import { buildOpenApiDocument } from './swagger.js'

const output = new URL('../../docs/openapi.json', import.meta.url)

const app = await NestFactory.create(AppModule, { preview: true, logger: false })
app.setGlobalPrefix(API_PREFIX)
const document = buildOpenApiDocument(app)

mkdirSync(new URL('.', output), { recursive: true })
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`)
console.log(`OpenAPI gerado em docs/openapi.json (${Object.keys(document.paths).length} rotas).`)
await app.close()
