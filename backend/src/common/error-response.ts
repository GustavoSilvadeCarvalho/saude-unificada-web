import { ApiProperty } from '@nestjs/swagger'

/** Formato de toda resposta de erro (ver http-exception.filter.ts), usado na documentação Swagger */
export class ErrorResponse {
  @ApiProperty({ example: 401 })
  statusCode: number

  @ApiProperty({ example: 'E-mail ou senha inválidos.', description: 'Mensagem em português, exibida ao usuário' })
  message: string
}
