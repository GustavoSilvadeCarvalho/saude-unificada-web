import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'
import { jsonSchemaOptions } from '../common/schema-options.js'
import {
  ALLERGY_SEVERITIES,
  type AllergySeverity,
  BLOOD_TYPES,
  type BloodType,
  CONDITION_STATUSES,
  type ConditionStatus,
  SEXES,
  type Sex,
} from './patient.constants.js'

// O prontuário fica embutido no documento do paciente: uma leitura traz tudo.
// Cada item das listas é um subdocumento com _id próprio, que sai como "id" (jsonSchemaOptions).
// Datas sem hora ficam como texto AAAA-MM-DD, igual ao contrato.
// Campos com tipo união (ex.: severity) precisam de type: String explícito (ver CONTINUAR.md).

@Schema(jsonSchemaOptions)
export class Allergy {
  @Prop({ required: true, trim: true })
  substance: string

  @Prop({ required: true, type: String, enum: ALLERGY_SEVERITIES })
  severity: AllergySeverity

  @Prop({ trim: true })
  reaction?: string

  @Prop({ required: true })
  recordedAt: string
}
export const AllergySchema = SchemaFactory.createForClass(Allergy)

@Schema(jsonSchemaOptions)
export class Medication {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true, trim: true })
  dosage: string

  @Prop({ required: true, trim: true })
  frequency: string

  @Prop({ required: true })
  startDate: string

  @Prop({ trim: true })
  prescribedBy?: string
}
export const MedicationSchema = SchemaFactory.createForClass(Medication)

@Schema(jsonSchemaOptions)
export class Procedure {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true })
  date: string

  @Prop({ trim: true })
  location?: string

  @Prop({ trim: true })
  notes?: string
}
export const ProcedureSchema = SchemaFactory.createForClass(Procedure)

@Schema(jsonSchemaOptions)
export class Exam {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true })
  date: string

  @Prop({ required: true, trim: true })
  result: string

  @Prop()
  fileName?: string

  /** Atendimento e documento de onde o exame veio (quando foi anexado num atendimento) */
  @Prop()
  appointmentId?: string

  @Prop()
  documentId?: string
}
export const ExamSchema = SchemaFactory.createForClass(Exam)

@Schema(jsonSchemaOptions)
export class ClinicalCondition {
  @Prop({ required: true, trim: true })
  name: string

  /** Código CID-10, ex.: "I10" */
  @Prop({ trim: true, uppercase: true })
  cid?: string

  @Prop({ required: true })
  diagnosedAt: string

  @Prop({ required: true, type: String, enum: CONDITION_STATUSES })
  status: ConditionStatus
}
export const ClinicalConditionSchema = SchemaFactory.createForClass(ClinicalCondition)

@Schema({ ...jsonSchemaOptions, collection: 'patients', timestamps: true })
export class Patient {
  /** Só dígitos, 11 caracteres. É a chave do prontuário unificado */
  @Prop({ required: true, unique: true })
  cpf: string

  @Prop({ required: true, trim: true })
  fullName: string

  @Prop({ required: true })
  birthDate: string

  @Prop({ required: true, type: String, enum: SEXES })
  sex: Sex

  @Prop({ required: true, type: String, enum: BLOOD_TYPES })
  bloodType: BloodType

  @Prop({ trim: true })
  phone?: string

  @Prop({ trim: true, lowercase: true })
  email?: string

  /** Região de saúde de residência (usada nos dados regionais do gestor) */
  @Prop({ required: true, index: true })
  region: string

  @Prop({ type: [AllergySchema], default: [] })
  allergies: Allergy[]

  @Prop({ type: [MedicationSchema], default: [] })
  activeMedications: Medication[]

  @Prop({ type: [ProcedureSchema], default: [] })
  procedures: Procedure[]

  @Prop({ type: [ExamSchema], default: [] })
  exams: Exam[]

  @Prop({ type: [ClinicalConditionSchema], default: [] })
  clinicalConditions: ClinicalCondition[]
}

export type PatientDocument = HydratedDocument<Patient>
export const PatientSchema = SchemaFactory.createForClass(Patient)
