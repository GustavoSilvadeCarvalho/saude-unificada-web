import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'
import { configureApp } from './app.setup.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  configureApp(app)

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  Logger.log(`API rodando em http://localhost:${port}/api (Swagger em /api/docs)`, 'Bootstrap')
}

await bootstrap()
