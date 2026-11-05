import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { CurrentUser } from '../common/current-user.decorator.js'
import { ErrorResponse } from '../common/error-response.js'
import { type AuthUser, Roles } from '../common/roles.js'
import { MAX_UPLOAD_BYTES } from '../common/uploads.js'
import { DOCUMENT_TYPES } from './appointment.constants.js'
import { AttachedDocumentResponse } from './appointment.responses.js'
import { DocumentsService } from './documents.service.js'
import { UploadDocumentDto } from './upload-document.dto.js'

class DownloadLinkResponse {
  @ApiProperty({
    example: 'https://saude-unificada-docs.s3.sa-east-1.amazonaws.com/appointments/...&X-Amz-Expires=300',
    description: 'Abrir direto no navegador ou no app (não precisa do token)',
  })
  url: string

  @ApiProperty({ example: '2026-10-01T14:46:00.000Z', description: 'O link vale 5 minutos' })
  expiresAt: string
}

@ApiTags('Documentos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponse,
  description: 'Sem token, token inválido ou expirado',
  example: { statusCode: 401, message: 'Faça login para continuar.' },
})
@ApiParam({ name: 'id', description: 'Id do atendimento', example: '6729f1c2a3b4c5d6e7f80b01' })
@Roles('medico')
@Controller('appointments/:id/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } }))
  @ApiOperation({
    summary: 'Anexa receita, laudo, exame ou outro documento ao atendimento',
    description:
      'Um arquivo por requisição, em `multipart/form-data`. Aceita PDF, JPG e PNG de até 10 MB ' +
      '(o tipo é conferido pelo conteúdo, não pelo nome). Só o médico do atendimento pode enviar. ' +
      '`laudo` e `exame` também entram na lista de exames do prontuário.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'PDF, JPG ou PNG, até 10 MB' },
        type: { type: 'string', enum: [...DOCUMENT_TYPES], example: 'receita' },
      },
    },
  })
  @ApiCreatedResponse({ type: AttachedDocumentResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Sem arquivo, formato não aceito, tipo inválido ou limite de documentos',
    example: { statusCode: 400, message: 'Formato não aceito. Envie PDF, JPG ou PNG.' },
  })
  @ApiForbiddenResponse({
    type: ErrorResponse,
    description: 'Atendimento de outro médico, ou perfil sem permissão',
    example: { statusCode: 403, message: 'Só o médico do atendimento pode anexar documentos.' },
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Atendimento não encontrado',
    example: { statusCode: 404, message: 'Atendimento não encontrado.' },
  })
  @ApiPayloadTooLargeResponse({
    type: ErrorResponse,
    description: 'Arquivo maior que 10 MB',
    example: { statusCode: 413, message: 'Arquivo muito grande. O limite é de 10 MB.' },
  })
  upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload(id, file, body.type, user)
  }

  @Get(':documentId/download')
  @ApiOperation({
    summary: 'Link temporário para baixar o documento',
    description:
      'Devolve uma URL válida por 5 minutos (no S3, URL pré-assinada; no ambiente local, link assinado pela API). ' +
      'Qualquer médico pode baixar, pois o prontuário é unificado; cada download fica na auditoria.',
  })
  @ApiParam({ name: 'documentId', example: '6729f1c2a3b4c5d6e7f80c01' })
  @ApiOkResponse({ type: DownloadLinkResponse })
  @ApiForbiddenResponse({
    type: ErrorResponse,
    description: 'Perfil sem permissão',
    example: { statusCode: 403, message: 'Seu perfil não tem permissão para acessar este recurso.' },
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Atendimento ou documento não encontrado',
    example: { statusCode: 404, message: 'Documento não encontrado.' },
  })
  downloadLink(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
  ) {
    const apiBaseUrl = this.config.get<string>('PUBLIC_API_URL') ?? `${req.protocol}://${req.get('host')}`
    return this.documentsService.downloadLink(id, documentId, user, apiBaseUrl)
  }
}
