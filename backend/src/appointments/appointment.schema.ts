import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument, Types } from 'mongoose'
import { jsonSchemaOptions } from '../common/schema-options.js'
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  DOCUMENT_TYPES,
  type DocumentType,
} from './appointment.constants.js'

/** Receita, laudo etc. anexado ao atendimento (o arquivo em si fica no S3; ver bloco 8) */
@Schema(jsonSchemaOptions)
export class AttachedDocument {
  @Prop({ required: true, trim: true })
  fileName: string

  @Prop({ required: true, type: String, enum: DOCUMENT_TYPES })
  type: DocumentType

  @Prop({ required: true, type: Date, default: () => new Date() })
  uploadedAt: Date

  /** Caminho do arquivo no armazenamento. Nunca sai na resposta (jsonSchemaOptions) */
  @Prop({ required: true })
  storageKey: string

  @Prop({ required: true })
  mimeType: string

  /** Tamanho em bytes */
  @Prop({ required: true })
  size: number
}
export const AttachedDocumentSchema = SchemaFactory.createForClass(AttachedDocument)

/**
 * Atendimento: o que já aconteceu ("realizado") ou o que está marcado ("agendado").
 * Nome do paciente e do médico ficam copiados para a agenda não depender de outra consulta.
 */
@Schema({ ...jsonSchemaOptions, collection: 'appointments', timestamps: true })
export class Appointment {
  @Prop({ required: true })
  patientCpf: string

  @Prop({ required: true })
  patientName: string

  @Prop({ required: true, type: Types.ObjectId })
  doctorId: Types.ObjectId

  @Prop({ required: true })
  doctorName: string

  /** Data e hora (sai em ISO 8601 na resposta) */
  @Prop({ required: true, type: Date })
  date: Date

  @Prop({ required: true, type: String, enum: APPOINTMENT_STATUSES })
  status: AppointmentStatus

  @Prop({ trim: true })
  reason?: string

  @Prop({ type: String, default: '' })
  summary: string

  @Prop({ type: [AttachedDocumentSchema], default: [] })
  documents: AttachedDocument[]
}

export type AppointmentDocument = HydratedDocument<Appointment>
export const AppointmentSchema = SchemaFactory.createForClass(Appointment)

// Agenda do médico (data crescente) e histórico do paciente (data decrescente)
AppointmentSchema.index({ doctorId: 1, date: 1 })
AppointmentSchema.index({ patientCpf: 1, date: -1 })
