import { Controller, Get, Param } from '@nestjs/common'
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { ErrorResponse } from '../common/error-response.js'
import { Public } from '../common/roles.js'
import { VERIFICATION_CODE_EXAMPLE } from '../common/verification.js'
import { VerifiedDocumentResponse } from './appointment.responses.js'
import { DocumentsService } from './documents.service.js'

@ApiTags('Verificação de documentos')
@Public()
@Controller('verify')
export class VerificationController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':code')
  @ApiOperation({
    summary: 'Confere se uma receita, laudo ou exame é autêntico (sem login)',
    description:
      'Para a farmácia ou outro serviço de saúde: digite o código impresso no documento. ' +
      'Aceita minúsculas e sem traços. Mostra quem emitiu, quando e o SHA-256 do arquivo, ' +
      'mas só as iniciais do paciente (sem CPF nem nome completo).',
  })
  @ApiParam({ name: 'code', example: VERIFICATION_CODE_EXAMPLE })
  @ApiOkResponse({ type: VerifiedDocumentResponse })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Código inexistente ou mal digitado',
    example: { statusCode: 404, message: 'Nenhum documento com esse código. Confira o código impresso no documento.' },
  })
  verify(@Param('code') code: string) {
    return this.documentsService.verify(code)
  }
}
