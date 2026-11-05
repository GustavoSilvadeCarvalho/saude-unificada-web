import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module.js'
import { configureApp } from './app.setup.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  configureApp(app)

  // Documentação interativa em /api/docs
  const swagger = new DocumentBuilder()
    .setTitle('Saúde Unificada — API')
    .setDescription('Prontuário unificado por CPF. Contrato em docs/API_CONTRACT.md')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger))

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  Logger.log(`API rodando em http://localhost:${port}/api (docs em /api/docs)`, 'Bootstrap')
}

await bootstrap()
