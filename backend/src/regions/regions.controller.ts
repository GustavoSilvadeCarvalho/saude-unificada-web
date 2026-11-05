import { Controller, Get, Query } from '@nestjs/common'
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'
import { ErrorResponse } from '../common/error-response.js'
import { Roles } from '../common/roles.js'
import { RegionalDataQuery } from './regional-data.query.js'
import { RegionalRecordResponse } from './regional-data.responses.js'
import { RegionsService } from './regions.service.js'

@ApiTags('Dados regionais')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  type: ErrorResponse,
  description: 'Sem token, token inválido ou expirado',
  example: { statusCode: 401, message: 'Faça login para continuar.' },
})
@Controller()
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get('regions')
  @Roles('medico', 'gestor')
  @ApiOperation({
    summary: 'Regiões de saúde',
    description: 'Usada no filtro do painel do gestor e no cadastro de paciente (por isso médico também acessa).',
  })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['Grande São Paulo', 'Campinas', 'Baixada Santista', 'Vale do Paraíba', 'Sorocaba', 'Ribeirão Preto'],
    },
  })
  regions() {
    return this.regionsService.names()
  }

  @Get('regional-data')
  @Roles('gestor')
  @ApiOperation({
    summary: 'Dados regionais agregados para o painel do gestor',
    description:
      'Uma linha por região por mês, ordenada por região e mês. Os dados são agregados e anônimos (sem CPF nem nome). ' +
      'Totais, médias, ranking de condições e evolução mensal são calculados no front a partir desta lista.',
  })
  @ApiOkResponse({ type: [RegionalRecordResponse] })
  @ApiBadRequestResponse({
    type: ErrorResponse,
    description: 'Mês em formato inválido, mês inicial depois do final, ou região inexistente',
    example: { statusCode: 400, message: 'O mês inicial não pode ser depois do mês final.' },
  })
  @ApiForbiddenResponse({
    type: ErrorResponse,
    description: 'Só o gestor público acessa',
    example: { statusCode: 403, message: 'Seu perfil não tem permissão para acessar este recurso.' },
  })
  regionalData(@Query() query: RegionalDataQuery) {
    return this.regionsService.regionalData(query)
  }
}
