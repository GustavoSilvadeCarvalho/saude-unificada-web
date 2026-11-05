import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { ParseCpfPipe } from '../common/cpf.pipe.js'
import { CurrentUser } from '../common/current-user.decorator.js'
import { ErrorResponse } from '../common/error-response.js'
import { type AuthUser, Roles } from '../common/roles.js'
import { CreatePatientDto } from './create-patient.dto.js'
import { PatientResponse } from './patient.responses.js'
import { PatientsService } from './patients.service.js'

// Prontuário é dado sensível: só médicos acessam, e cada acesso fica na auditoria.
@ApiTags('Pacientes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponse,
  description: 'Sem token, token inválido ou expirado',
  example: { statusCode: 401, message: 'Faça login para continuar.' },
})
@ApiForbiddenResponse({
  type: ErrorResponse,
  description: 'Perfil sem permissão (só médicos acessam prontuários)',
  example: { statusCode: 403, message: 'Seu perfil não tem permissão para acessar este recurso.' },
})
@Roles('medico')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get(':cpf')
  @ApiOperation({
    summary: 'Prontuário unificado do paciente',
    description: 'Busca pelo CPF (com ou sem máscara). O acesso é registrado na auditoria (LGPD).',
  })
  @ApiParam({ name: 'cpf', example: '12345678909', description: 'CPF do paciente' })
  @ApiOkResponse({ type: PatientResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'CPF inválido',
    example: { statusCode: 400, message: 'CPF inválido.' },
  })
  @ApiNotFoundResponse({
    type: ErrorResponse,
    description: 'Nenhum paciente com este CPF (o site oferece o cadastro)',
    example: { statusCode: 404, message: 'Paciente não encontrado.' },
  })
  getRecord(@Param('cpf', ParseCpfPipe) cpf: string, @CurrentUser() user: AuthUser) {
    return this.patientsService.getRecord(cpf, user)
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um paciente',
    description:
      'Cria o prontuário com as listas vazias. Alergias, medicamentos e condições entram depois, pelos atendimentos.',
  })
  @ApiCreatedResponse({ type: PatientResponse })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'CPF inválido ou campo obrigatório faltando/inválido',
    example: { statusCode: 400, message: 'CPF inválido.' },
  })
  @ApiConflictResponse({
    type: ErrorResponse,
    description: 'CPF já cadastrado',
    example: { statusCode: 409, message: 'Já existe um paciente cadastrado com este CPF.' },
  })
  create(@Body() body: CreatePatientDto, @CurrentUser() user: AuthUser) {
    return this.patientsService.create(body, user)
  }
}
