import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpExceptionFilter } from './common/http-exception.filter.js'

/** Configuração compartilhada entre o servidor (main.ts) e os testes */
export function configureApp(app: INestApplication) {
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
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
}
