import { ApiProperty } from '@nestjs/swagger'

export class ConditionCountResponse {
  @ApiProperty({ example: 'Hipertensão' })
  name: string

  @ApiProperty({ example: 1020 })
  count: number
}

export class RegionalRecordResponse {
  @ApiProperty({ example: 'Campinas' })
  region: string

  @ApiProperty({ example: '2026-09', description: 'AAAA-MM' })
  month: string

  @ApiProperty({ example: 6120, description: 'Atendimentos no mês' })
  appointments: number

  @ApiProperty({ example: 4010, description: 'Pacientes únicos atendidos no mês' })
  uniquePatients: number

  @ApiProperty({ type: [ConditionCountResponse], description: 'Condições mais atendidas, da maior para a menor' })
  conditions: ConditionCountResponse[]
}
