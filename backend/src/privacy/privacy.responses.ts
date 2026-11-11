import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LinkedDoctorResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80912' })
  doctorId: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  name: string

  @ApiPropertyOptional({ example: 'Clínica Médica' })
  specialty?: string

  @ApiPropertyOptional({ example: 'CRM-SP 123456' })
  crm?: string

  @ApiProperty({ example: false, description: 'true: o médico não consegue abrir o prontuário' })
  blocked: boolean

  @ApiPropertyOptional({ example: '2026-11-09T14:00:00.000Z' })
  blockedAt?: string
}
