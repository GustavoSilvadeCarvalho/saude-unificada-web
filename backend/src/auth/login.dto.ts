import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'medico@teste.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha.' })
  password: string
}
