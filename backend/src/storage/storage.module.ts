import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FilesController } from './files.controller.js'
import { createStorage } from './storage.factory.js'
import { StorageService } from './storage.service.js'

/** Armazenamento de arquivos disponível para a API toda (driver escolhido por STORAGE_DRIVER) */
@Global()
@Module({
  controllers: [FilesController],
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createStorage({
          STORAGE_DRIVER: config.get('STORAGE_DRIVER'),
          UPLOAD_DIR: config.get('UPLOAD_DIR'),
          FILE_SIGNING_SECRET: config.get('FILE_SIGNING_SECRET'),
          JWT_SECRET: config.get('JWT_SECRET'),
          S3_BUCKET: config.get('S3_BUCKET'),
          S3_ENDPOINT: config.get('S3_ENDPOINT'),
          AWS_REGION: config.get('AWS_REGION'),
        }),
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
