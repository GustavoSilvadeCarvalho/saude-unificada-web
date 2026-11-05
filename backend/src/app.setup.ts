import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import compression from 'compression'
import helmet from 'helmet'
import { HttpExceptionFilter } from './common/http-exception.filter.js'
import { validationExceptionFactory } from './common/validation.js'
import { setupSwagger } from './swagger.js'

/** Todas as rotas ficam em /api/... */
export const API_PREFIX = 'api'

/** Configuração compartilhada entre o servidor (main.ts) e os testes */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService)

  // Atrás do CloudFront + ALB (2 saltos), o IP real do cliente vem no X-Forwarded-For.
  // Sem isso, o rate limit do login veria todo mundo com o IP do load balancer.
  app.getHttpAdapter().getInstance().set('trust proxy', Number(config.get<string>('TRUST_PROXY', '0')))

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
