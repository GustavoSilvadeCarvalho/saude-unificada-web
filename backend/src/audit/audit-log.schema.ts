import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument, Types } from 'mongoose'
import { USER_ROLES, type UserRole } from '../common/roles.js'
import { jsonSchemaOptions } from '../common/schema-options.js'

/** Ações registradas na trilha de auditoria */
export const AUDIT_ACTIONS = [
  'patient.view', // abriu o prontuário
  'patient.create', // cadastrou o paciente
  'appointments.view', // listou o histórico de atendimentos do paciente
  'appointment.create', // registrou ou concluiu um atendimento (e atualizou o prontuário)
  'document.upload', // anexou receita, laudo etc.
  'document.download', // gerou link para baixar um documento
] as const
export type AuditAction = (typeof AUDIT_ACTIONS)[number]

/**
 * Quem acessou qual prontuário e quando (LGPD: dado de saúde é dado sensível).
 * Os registros só são gravados, nunca alterados. O nome e o perfil são copiados
 * para o registro continuar legível mesmo se o usuário mudar depois.
 */
@Schema({
  ...jsonSchemaOptions,
  collection: 'audit_logs',
  timestamps: { createdAt: 'at', updatedAt: false },
})
export class AuditLog {
  @Prop({ required: true, type: Types.ObjectId })
  userId: Types.ObjectId

  @Prop({ required: true })
  userName: string

  @Prop({ required: true, type: String, enum: USER_ROLES })
  userRole: UserRole

  @Prop({ required: true, type: String, enum: AUDIT_ACTIONS })
  action: AuditAction

  @Prop({ required: true })
  patientCpf: string

  /** Preenchido automaticamente (timestamps) */
  at: Date
}

export type AuditLogDocument = HydratedDocument<AuditLog>
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog)

// Consulta típica: "quem acessou o prontuário deste CPF", do mais recente ao mais antigo
AuditLogSchema.index({ patientCpf: 1, at: -1 })
