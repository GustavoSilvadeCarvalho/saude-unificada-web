import { readFileSync } from 'node:fs'
import type { INestApplication } from '@nestjs/common'
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  version: string
}

const DESCRIPTION = `
API da plataforma **Saúde Unificada**: prontuário unificado por CPF, usada pelo site (médicos e gestores) e pelo app (pacientes).

**Como testar por aqui**
1. Abra *Autenticação → POST /api/auth/login* e clique em **Execute** (o exemplo já vem com o médico de teste).
2. Copie o \`token\` da resposta, clique em **Authorize** (cadeado no topo) e cole o token.
3. As outras rotas passam a mandar o token automaticamente (ele fica salvo mesmo se a página recarregar).

**Usuários de teste** (ambiente de desenvolvimento e demonstração), senha \`123456\`:
- \`medico@teste.com\`: médico (Clínica Médica)
- \`cardio@teste.com\`: médica (Cardiologia)
- \`gestor@teste.com\`: gestora pública

Erros sempre voltam como \`{ "statusCode": 401, "message": "..." }\`, com a mensagem em português.
Contrato completo: \`docs/API_CONTRACT.md\`.
`.trim()

/** Monta o documento OpenAPI a partir dos decorators dos controllers */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Saúde Unificada — API')
    .setDescription(DESCRIPTION)
    .setVersion(version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token devolvido pelo login' })
    .addTag('Autenticação', 'Login e dados do usuário logado')
    .addTag('Pacientes', 'Cadastro e prontuário unificado por CPF (só médicos; acessos auditados)')
    .addTag('Saúde', 'Status da API e do banco (monitoramento e load balancer)')
    .build()
  return SwaggerModule.createDocument(app, config)
}

/** Swagger UI em /api/docs e o JSON em /api/docs-json */
export function setupSwagger(app: INestApplication) {
  SwaggerModule.setup('api/docs', app, () => buildOpenApiDocument(app), {
    jsonDocumentUrl: 'api/docs-json',
    customSiteTitle: 'Saúde Unificada — API',
    swaggerOptions: {
      persistAuthorization: true, // mantém o token depois de recarregar a página
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  })
}
