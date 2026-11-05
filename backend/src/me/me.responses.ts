import { ApiProperty } from '@nestjs/swagger'
import { USER_ROLES } from '../common/roles.js'

export class AccessLogEntryResponse {
  @ApiProperty({ example: '2026-10-01T14:30:00.000Z' })
  at: string

  @ApiProperty({ example: 'Abriu o seu prontuário' })
  description: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  userName: string

  @ApiProperty({ enum: USER_ROLES, example: 'medico' })
  userRole: string

  @ApiProperty({ example: 'patient.view', description: 'Código da ação (auditoria)' })
  action: string
}
