import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import compression from 'compression'
import helmet from 'helmet'
import { HttpExceptionFilter } from './common/http-exception.filter.js'
import { validationExceptionFactory } from './common/validation.js'
import { setupSwagger } from './swagger.js'

/** Todas as rotas ficam em /api/... */
export const API_PREFIX = 'api'

/** Maior que o tempo de conexão ociosa do ALB (60 s) */
export const KEEP_ALIVE_TIMEOUT_MS = 65_000

/** Configuração compartilhada entre o servidor (main.ts) e os testes */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService)

  // Atrás do CloudFront + ALB (2 saltos), o IP real do cliente vem no X-Forwarded-For.
  // Sem isso, o rate limit do login veria todo mundo com o IP do load balancer.
  app.getHttpAdapter().getInstance().set('trust proxy', Number(config.get<string>('TRUST_PROXY', '0')))

  // O ALB da AWS reaproveita a conexão com a API por até 60 s. O Node fecha conexões paradas
  // em 5 s por padrão: o ALB acaba mandando a requisição numa conexão já fechada e devolve 502.
  // A API precisa segurar a conexão por mais tempo que o ALB.
  const server = app.getHttpServer()
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS
  server.headersTimeout = KEEP_ALIVE_TIMEOUT_MS + 1_000

  // Cabeçalhos de segurança (HSTS, nosniff, frame-ancestors...). A CSP libera só o
  // necessário para o Swagger UI, que usa estilos inline e imagens em data:.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          scriptSrc: ["'self'"],
        },
      },
    }),
  )
  // Respostas JSON grandes (prontuário, dados regionais) vão comprimidas com gzip
  app.use(compression())

  app.setGlobalPrefix(API_PREFIX)
  app.enableCors({
    origin: config
      .get<string>('CORS_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // descarta campos que não estão no DTO
      transform: true,
      stopAtFirstError: true,
      exceptionFactory: validationExceptionFactory, // mensagens legíveis, inclusive dentro de listas
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  // Documentação interativa em /api/docs (desligar com SWAGGER_ENABLED=false)
  if (config.get<string>('SWAGGER_ENABLED', 'true') !== 'false') setupSwagger(app)
}
