import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsMongoId, IsOptional } from 'class-validator'
import { NormalizeCpf } from '../common/transforms.js'
import { IsCpf } from '../common/validators.js'

/** Filtros de GET /appointments: informar um dos dois */
export class ListAppointmentsQuery {
  @ApiPropertyOptional({
    example: '6729f1c2a3b4c5d6e7f80912',
    description: 'Agenda do médico (só o próprio médico). Ordem: data crescente',
  })
  @IsOptional()
  @IsMongoId({ message: 'Médico inválido.' })
  doctorId?: string

  @ApiPropertyOptional({
    example: '22916926402',
    description: 'Histórico do paciente, de todos os médicos. Ordem: data decrescente',
  })
  @IsOptional()
  @NormalizeCpf()
  @IsCpf()
  patientCpf?: string
}
