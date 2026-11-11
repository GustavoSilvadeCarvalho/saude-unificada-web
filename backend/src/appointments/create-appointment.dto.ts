import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator'
import { EmptyToUndefined, NormalizeCpf, Trim } from '../common/transforms.js'
import { IsCpf, IsDateOnly } from '../common/validators.js'
import {
  ALLERGY_SEVERITIES,
  type AllergySeverity,
  CONDITION_STATUSES,
  type ConditionStatus,
} from '../patients/patient.constants.js'
import { APPOINTMENT_STATUSES, type AppointmentStatus } from './appointment.constants.js'

/** Código CID-10: letra + 2 dígitos, com subcategoria opcional (ex.: I10, J45.0, E11.65) */
const CID_10 = /^[A-Z]\d{2}(\.\d{1,2})?$/i

/** Máximo de itens novos de cada lista por atendimento */
const MAX_ITEMS = 20

export class NewAllergyDto {
  @ApiProperty({ example: 'Ibuprofeno' })
  @Trim()
  @IsString({ message: 'Informe a substância da alergia.' })
  @IsNotEmpty({ message: 'Informe a substância da alergia.' })
  @MaxLength(100, { message: 'Substância da alergia muito longa (máximo de 100 caracteres).' })
  substance: string

  @ApiProperty({ enum: ALLERGY_SEVERITIES, example: 'moderada' })
  @IsIn(ALLERGY_SEVERITIES, { message: 'Gravidade da alergia inválida. Use leve, moderada ou grave.' })
  severity: AllergySeverity

  @ApiPropertyOptional({ example: 'Urticária' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Reação muito longa (máximo de 200 caracteres).' })
  reaction?: string

  @ApiProperty({ example: '2026-10-01', description: 'AAAA-MM-DD, não pode ser no futuro' })
  @IsDateOnly({ notFuture: true }, { message: 'Data de registro da alergia inválida. Use o formato AAAA-MM-DD.' })
  recordedAt: string
}

export class NewMedicationDto {
  @ApiProperty({ example: 'Amoxicilina' })
  @Trim()
  @IsString({ message: 'Informe o nome do medicamento.' })
  @IsNotEmpty({ message: 'Informe o nome do medicamento.' })
  @MaxLength(120, { message: 'Nome do medicamento muito longo (máximo de 120 caracteres).' })
  name: string

  @ApiProperty({ example: '500 mg' })
  @Trim()
  @IsString({ message: 'Informe a dosagem do medicamento.' })
  @IsNotEmpty({ message: 'Informe a dosagem do medicamento.' })
  @MaxLength(60, { message: 'Dosagem muito longa (máximo de 60 caracteres).' })
  dosage: string

  @ApiProperty({ example: '8 em 8 horas' })
  @Trim()
  @IsString({ message: 'Informe a frequência do medicamento.' })
  @IsNotEmpty({ message: 'Informe a frequência do medicamento.' })
  @MaxLength(100, { message: 'Frequência muito longa (máximo de 100 caracteres).' })
  frequency: string

  @ApiProperty({ example: '2026-10-01', description: 'AAAA-MM-DD' })
  @IsDateOnly({}, { message: 'Data de início do medicamento inválida. Use o formato AAAA-MM-DD.' })
  startDate: string

  @ApiPropertyOptional({ example: 'Dr. Rafael Moreira Lima', description: 'Padrão: o médico do atendimento' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  prescribedBy?: string
}

export class NewConditionDto {
  @ApiProperty({ example: 'Sinusite aguda' })
  @Trim()
  @IsString({ message: 'Informe o nome da condição clínica.' })
  @IsNotEmpty({ message: 'Informe o nome da condição clínica.' })
  @MaxLength(120, { message: 'Nome da condição muito longo (máximo de 120 caracteres).' })
  name: string

  @ApiPropertyOptional({ example: 'J01', description: 'Código CID-10 (ex.: I10, J45.0)' })
  @EmptyToUndefined()
  @IsOptional()
  @Matches(CID_10, { message: 'CID inválido. Use o formato CID-10 (ex.: I10, J45.0).' })
  cid?: string

  @ApiProperty({ enum: CONDITION_STATUSES, example: 'ativa' })
  @IsIn(CONDITION_STATUSES, { message: 'Situação da condição inválida. Use ativa, controlada ou resolvida.' })
  status: ConditionStatus

  @ApiProperty({ example: '2026-10-01', description: 'AAAA-MM-DD, não pode ser no futuro' })
  @IsDateOnly({ notFuture: true }, { message: 'Data do diagnóstico inválida. Use o formato AAAA-MM-DD.' })
  diagnosedAt: string
}

export class CreateAppointmentDto {
  @ApiPropertyOptional({
    example: '6729f1c2a3b4c5d6e7f80b01',
    description: 'Se informado, conclui (ou remarca) esse agendamento em vez de criar outro',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  scheduledAppointmentId?: string

  @ApiProperty({ example: '22916926402' })
  @NormalizeCpf()
  @IsCpf()
  patientCpf: string

  @ApiProperty({ example: '6729f1c2a3b4c5d6e7f80912', description: 'Tem que ser o médico logado' })
  @IsMongoId({ message: 'Médico inválido.' })
  doctorId: string

  @ApiProperty({
    example: '2026-10-01T14:30:00.000Z',
    description: 'ISO 8601. Realizado: não pode ser no futuro. Agendado: tem que ser no futuro.',
  })
  @IsISO8601({ strict: true }, { message: 'Data e hora inválidas. Use o formato ISO 8601.' })
  date: string

  @ApiProperty({ enum: APPOINTMENT_STATUSES, example: 'realizado' })
  @IsIn(APPOINTMENT_STATUSES, { message: 'Situação do atendimento inválida. Use realizado ou agendado.' })
  status: AppointmentStatus

  @ApiPropertyOptional({ example: 'Retorno — controle glicêmico' })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Motivo muito longo (máximo de 200 caracteres).' })
  reason?: string

  @ApiProperty({
    example: 'Paciente estável, glicemia em melhora. Mantida conduta.',
    description: 'Obrigatório (mínimo de 10 caracteres) quando realizado; pode ser vazio no agendamento',
  })
  @Trim()
  @IsString({ message: 'Informe o resumo do atendimento.' })
  @MaxLength(5000, { message: 'Resumo muito longo (máximo de 5000 caracteres).' })
  summary: string

  @ApiPropertyOptional({
    example: 'Jejum de 8 horas. Trazer os exames de sangue e a lista de remédios em uso.',
    description: 'Orientações para o paciente antes do atendimento: jejum, preparo, o que levar',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Orientações muito longas (máximo de 1000 caracteres).' })
  instructions?: string

  @ApiPropertyOptional({ type: [NewAllergyDto], description: 'Adicionadas às alergias do paciente' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS, { message: `No máximo ${MAX_ITEMS} alergias por atendimento.` })
  @ValidateNested({ each: true })
  @Type(() => NewAllergyDto)
  newAllergies?: NewAllergyDto[]

  @ApiPropertyOptional({ type: [NewMedicationDto], description: 'Adicionados aos medicamentos ativos' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS, { message: `No máximo ${MAX_ITEMS} medicamentos por atendimento.` })
  @ValidateNested({ each: true })
  @Type(() => NewMedicationDto)
  newMedications?: NewMedicationDto[]

  @ApiPropertyOptional({ type: [NewConditionDto], description: 'Adicionadas às condições clínicas' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ITEMS, { message: `No máximo ${MAX_ITEMS} condições por atendimento.` })
  @ValidateNested({ each: true })
  @Type(() => NewConditionDto)
  newConditions?: NewConditionDto[]
}
