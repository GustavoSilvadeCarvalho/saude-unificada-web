import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import type { Request } from 'express'
import { AppointmentResponse, DownloadLinkResponse } from '../appointments/appointment.responses.js'
import { DocumentsService } from '../appointments/documents.service.js'
import { CurrentUser } from '../common/current-user.decorator.js'
import { ErrorResponse } from '../common/error-response.js'
import { type AuthUser, Roles } from '../common/roles.js'
import { ExamResponse, PatientResponse } from '../patients/patient.responses.js'
import { MyAppointmentsQuery } from './me.query.js'
import { AccessLogEntryResponse } from './me.responses.js'
import { MeService } from './me.service.js'

@ApiTags('Paciente (app)')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponse,
  description: 'Sem token, token inválido ou expirado',
  example: { statusCode: 401, message: 'Faça login para continuar.' },
})
@ApiForbiddenResponse({
  type: ErrorResponse,
  description: 'Só o perfil paciente (login por CPF) acessa',
  example: { statusCode: 403, message: 'Seu perfil não tem permissão para acessar este recurso.' },
})
@Roles('paciente')
@Controller('me')
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly documentsService: DocumentsService,
    private readonly config: ConfigService,
  ) {}

  @Get('record')
  @ApiOperation({
    summary: 'Carteira digital de saúde',
    description: 'O prontuário do próprio paciente (mesmo formato de GET /patients/:cpf). Somente leitura.',
  })
  @ApiOkResponse({ type: PatientResponse })
  record(@CurrentUser() user: AuthUser) {
    return this.meService.record(user)
  }

  @Get('appointments')
  @ApiOperation({
    summary: 'Histórico e próximos atendimentos',
    description: '`status=realizado`: o que já fez. `status=agendado`: o que vai fazer. Com os documentos anexados.',
  })
  @ApiOkResponse({ type: [AppointmentResponse] })
  appointments(@CurrentUser() user: AuthUser, @Query() query: MyAppointmentsQuery) {
    return this.meService.appointments(user, query)
  }

  @Get('exams')
  @ApiOperation({ summary: 'Exames e laudos, do mais recente ao mais antigo' })
  @ApiOkResponse({ type: [ExamResponse] })
  exams(@CurrentUser() user: AuthUser) {
    return this.meService.exams(user)
  }

  @Get('access-log')
  @ApiOperation({
    summary: 'Quem acessou o meu prontuário',
    description: 'LGPD: o paciente vê quais profissionais abriram o prontuário, registraram atendimento ou baixaram documentos.',
  })
  @ApiOkResponse({ type: [AccessLogEntryResponse] })
  accessLog(@CurrentUser() user: AuthUser) {
    return this.meService.accessLog(user)
  }

  @Get('appointments/:id/documents/:documentId/download')
  @ApiOperation({
    summary: 'Link para baixar um documento meu (receita, laudo, exame)',
    description: 'Mesmo funcionamento do link do médico (5 minutos, sem token). Só documentos do próprio paciente.',
  })
  @ApiParam({ name: 'id', example: '6729f1c2a3b4c5d6e7f80b01' })
  @ApiParam({ name: 'documentId', example: '6729f1c2a3b4c5d6e7f80c01' })
  @ApiOkResponse({ type: DownloadLinkResponse })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Atendimento ou documento não encontrado (ou de outro paciente)',
    example: { statusCode: 404, message: 'Documento não encontrado.' },
  })
  download(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @CurrentUser() user: AuthUser,
  ) {
    const apiBaseUrl = this.config.get<string>('PUBLIC_API_URL') ?? `${req.protocol}://${req.get('host')}`
    return this.documentsService.downloadLink(id, documentId, user, apiBaseUrl)
  }
}
