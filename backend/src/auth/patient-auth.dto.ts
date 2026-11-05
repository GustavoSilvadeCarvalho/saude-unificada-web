import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { NormalizeCpf } from '../common/transforms.js'
import { IsCpf, IsDateOnly } from '../common/validators.js'

/** Entrar no app: CPF e senha (como no gov.br) */
export class PatientLoginDto {
  @ApiProperty({ example: '22916926402', description: 'Só dígitos ou com máscara (229.169.264-02)' })
  @NormalizeCpf()
  @IsCpf()
  cpf: string

  @ApiProperty({ example: 'paciente123' })
  @IsString({ message: 'Informe a senha.' })
  @IsNotEmpty({ message: 'Informe a senha.' })
  password: string
}

/**
 * Primeiro acesso: o paciente prova que é ele com CPF + data de nascimento
 * (precisam bater com o cadastro feito pelo médico) e cria a senha.
 */
export class PatientRegisterDto {
  @ApiProperty({ example: '50717927296', description: 'Só dígitos ou com máscara' })
  @NormalizeCpf()
  @IsCpf()
  cpf: string

  @ApiProperty({ example: '1996-11-05', description: 'AAAA-MM-DD, igual à do cadastro na unidade de saúde' })
  @IsDateOnly({ notFuture: true }, { message: 'Data de nascimento inválida. Use o formato AAAA-MM-DD.' })
  birthDate: string

  @ApiProperty({
    example: 'meuApp2026',
    description: 'De 8 a 64 caracteres, com letras e números; não pode conter o CPF nem a data de nascimento',
  })
  @IsString({ message: 'Informe a senha.' })
  password: string
}
