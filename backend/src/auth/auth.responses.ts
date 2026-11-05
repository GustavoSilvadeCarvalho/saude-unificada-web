import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { USER_ROLES, type UserRole } from '../common/roles.js'

// Classes usadas só para documentar as respostas no Swagger (formato do API_CONTRACT.md).

export class UserResponse {
  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80912' })
  id: string

  @ApiProperty({ example: 'Dr. Rafael Moreira Lima' })
  name: string

  @ApiPropertyOptional({ example: 'medico@teste.com', description: 'Médico e gestor' })
  email?: string

  @ApiPropertyOptional({ example: '22916926402', description: 'Só no perfil paciente' })
  cpf?: string

  @ApiProperty({ enum: USER_ROLES, example: 'medico' })
  role: UserRole

  @ApiPropertyOptional({ example: 'CRM-SP 123456', description: 'Só para médicos' })
  crm?: string

  @ApiPropertyOptional({ example: 'Clínica Médica', description: 'Só para médicos' })
  specialty?: string

  @ApiPropertyOptional({ example: '(11) 3456-7890' })
  phone?: string

  @ApiPropertyOptional({ example: 'UBS Vila Mariana', description: 'Unidade de saúde (médico) ou órgão (gestor)' })
  institution?: string
}

export class LoginResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT para o header Authorization' })
  token: string

  @ApiProperty({ type: UserResponse })
  user: UserResponse
}
