import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'
import { REGIONS } from '../common/regions.js'
import { EmptyToUndefined, NormalizeCpf, Trim } from '../common/transforms.js'
import { IsCpf, IsDateOnly } from '../common/validators.js'
import { BLOOD_TYPES, type BloodType, SEXES, type Sex } from './patient.constants.js'

// Dados do cadastro. As listas do prontuário (alergias, medicamentos...) começam vazias
// e só crescem pelos atendimentos: campos extras enviados aqui são descartados (whitelist).
export class CreatePatientDto {
  @ApiProperty({
    example: '81646027876',
    description:
      'Só dígitos ou com a máscara 816.460.278-76. Precisa ter dígitos verificadores válidos; CPFs de exemplo conhecidos são recusados.',
  })
  @NormalizeCpf()
  @IsCpf()
  cpf: string

  @ApiProperty({ example: 'Fulano de Tal', maxLength: 120 })
  @Trim()
  @IsString({ message: 'Informe o nome completo.' })
  @IsNotEmpty({ message: 'Informe o nome completo.' })
  @MaxLength(120, { message: 'O nome pode ter no máximo 120 caracteres.' })
  fullName: string

  @ApiProperty({ example: '1990-05-10', description: 'AAAA-MM-DD, não pode ser no futuro' })
  @IsDateOnly({ notFuture: true }, { message: 'Data de nascimento inválida. Use o formato AAAA-MM-DD.' })
  birthDate: string

  @ApiProperty({ enum: SEXES, example: 'M' })
  @IsIn(SEXES, { message: 'Sexo inválido. Use F, M ou Outro.' })
  sex: Sex

  @ApiProperty({ enum: BLOOD_TYPES, example: 'Não informado' })
  @IsIn(BLOOD_TYPES, { message: 'Tipo sanguíneo inválido.' })
  bloodType: BloodType

  @ApiPropertyOptional({ example: '(19) 99999-0000', description: 'Vazio ("") é tratado como não informado' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Telefone inválido.' })
  phone?: string

  @ApiPropertyOptional({ example: 'fulano@email.com', description: 'Vazio ("") é tratado como não informado' })
  @EmptyToUndefined()
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  email?: string

  // A lista do Swagger é a inicial; quem decide se a região existe é a coleção "regions" (PatientsService)
  @ApiProperty({ enum: REGIONS, example: 'Campinas' })
  @Trim()
  @IsString({ message: 'Informe a região.' })
  @IsNotEmpty({ message: 'Informe a região.' })
  region: string
}
