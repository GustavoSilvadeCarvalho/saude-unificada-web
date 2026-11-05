import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { CurrentUser } from '../common/current-user.decorator.js'
import { ErrorResponse } from '../common/error-response.js'
import { type AuthUser, Roles } from '../common/roles.js'
import { AppointmentResponse } from './appointment.responses.js'
import { AppointmentsService } from './appointments.service.js'
import { CreateAppointmentDto } from './create-appointment.dto.js'
import { ListAppointmentsQuery } from './list-appointments.query.js'

@ApiTags('Atendimentos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponse,
  description: 'Sem token, token inválido ou expirado',
  example: { statusCode: 401, message: 'Faça login para continuar.' },
})
@Roles('medico')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Agenda do médico ou histórico do paciente',
    description:
      'Informe **um** filtro. `doctorId`: só a própria agenda, em ordem crescente de data. ' +
      '`patientCpf`: atendimentos do paciente com todos os médicos, do mais recente ao mais antigo (acesso auditado).',
  })
  @ApiOkResponse({ type: [AppointmentResponse] })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Nenhum filtro, os dois filtros juntos, ou filtro inválido',
    example: { statusCode: 400, message: 'Informe doctorId ou patientCpf.' },
  })
  @ApiForbiddenResponse({
    type: ErrorResponse,
    description: 'Agenda de outro médico, ou perfil sem permissão',
    example: { statusCode: 403, message: 'Você só pode ver a sua própria agenda.' },
  })
  list(@Query() query: ListAppointmentsQuery, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.list(query, user)
  }

  @Post()
  @ApiOperation({
    summary: 'Registra um atendimento e atualiza o prontuário',
    description:
      'Tudo numa transação: o atendimento, as alergias, medicamentos e condições novas do paciente e o registro de auditoria. ' +
      'Com `scheduledAppointmentId`, conclui (ou remarca) o agendamento em vez de criar outro. ' +
      'Realizado: data não pode ser no futuro e o resumo tem no mínimo 10 caracteres. ' +
      'Agendado: data no futuro e listas vazias.',
  })
  @ApiCreatedResponse({ type: AppointmentResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Dados inválidos ou regra do atendimento não atendida',
    example: { statusCode: 400, message: 'Um atendimento realizado não pode ter data no futuro.' },
  })
  @ApiForbiddenResponse({
    type: ErrorResponse,
    description: 'doctorId diferente do médico logado, agendamento de outro médico, ou perfil sem permissão',
    example: { statusCode: 403, message: 'Você só pode registrar atendimentos em seu próprio nome.' },
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Paciente ou agendamento não encontrado',
    example: { statusCode: 404, message: 'Paciente não encontrado.' },
  })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'O agendamento informado já foi registrado como realizado',
    example: { statusCode: 409, message: 'Este atendimento já foi registrado.' },
  })
  create(@Body() body: CreateAppointmentDto, @CurrentUser() user: AuthUser) {
    return this.appointmentsService.create(body, user)
  }
}
