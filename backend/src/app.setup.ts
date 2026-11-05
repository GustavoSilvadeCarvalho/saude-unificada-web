import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpExceptionFilter } from './common/http-exception.filter.js'
import { setupSwagger } from './swagger.js'

/** Todas as rotas ficam em /api/... */
export const API_PREFIX = 'api'

/** Configuração compartilhada entre o servidor (main.ts) e os testes */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService)

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
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  // Documentação interativa em /api/docs (desligar com SWAGGER_ENABLED=false)
  if (config.get<string>('SWAGGER_ENABLED', 'true') !== 'false') setupSwagger(app)
}
