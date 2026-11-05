import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Matches } from 'class-validator'
import { EmptyToUndefined, Trim } from '../common/transforms.js'

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

/** Filtros do painel do gestor (todos opcionais) */
export class RegionalDataQuery {
  @ApiPropertyOptional({ example: 'Campinas', description: 'Uma região de GET /regions (vazio = todas)' })
  @EmptyToUndefined()
  @IsOptional()
  @Trim()
  @IsString()
  region?: string

  @ApiPropertyOptional({ example: '2026-01', description: 'Mês inicial, inclusive (AAAA-MM)' })
  @EmptyToUndefined()
  @IsOptional()
  @Matches(MONTH, { message: 'Mês inicial inválido. Use o formato AAAA-MM.' })
  from?: string

  @ApiPropertyOptional({ example: '2026-10', description: 'Mês final, inclusive (AAAA-MM)' })
  @EmptyToUndefined()
  @IsOptional()
  @Matches(MONTH, { message: 'Mês final inválido. Use o formato AAAA-MM.' })
  to?: string
}
