import { Controller, Get, NotFoundException, Param, Res, StreamableFile } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { Response } from 'express'
import { Public } from '../common/roles.js'
import { LocalStorageService } from './local-storage.service.js'
import { contentDisposition, StorageService } from './storage.service.js'

const INVALID_LINK = 'Link de download inválido ou expirado. Abra o documento de novo pelo prontuário.'

/**
 * Entrega os arquivos do driver local pelo link assinado (o equivalente à URL pré-assinada do S3).
 * Público porque o link já é a autorização: assinado pela API e válido por 5 minutos.
 * Com o driver s3 esta rota não é usada (responde 404).
 */
@ApiExcludeController()
@Public()
@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  @Get(':token')
  async download(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
    if (!(this.storage instanceof LocalStorageService)) throw new NotFoundException(INVALID_LINK)
    const file = this.storage.verify(token)
    if (!file) throw new NotFoundException(INVALID_LINK)

    const opened = await this.storage.open(file.key)
    if (!opened) throw new NotFoundException('Arquivo não encontrado.')

    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return new StreamableFile(opened.stream, {
      type: file.mimeType,
      length: opened.size,
      disposition: contentDisposition(file.fileName),
    })
  }
}
