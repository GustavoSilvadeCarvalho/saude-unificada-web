import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'
import { USER_ROLES, type UserRole } from '../common/roles.js'
import { jsonSchemaOptions } from '../common/schema-options.js'

/**
 * Quem acessa a plataforma: profissional de saúde e gestor (site, login por e-mail)
 * ou paciente (app, login por CPF, como no gov.br).
 */
@Schema({ ...jsonSchemaOptions, collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string

  /** Login de médico e gestor. Paciente não tem (entra pelo CPF) */
  @Prop({
    type: String,
    lowercase: true,
    trim: true,
    required(this: User) {
      return this.role !== 'paciente'
    },
  })
  email?: string

  /** Login do paciente: liga a conta ao prontuário (só dígitos) */
  @Prop({
    type: String,
    required(this: User) {
      return this.role === 'paciente'
    },
  })
  cpf?: string

  /** Hash bcrypt. Nunca sai nas respostas (removido no toJSON) */
  @Prop({ required: true, select: false })
  passwordHash: string

  @Prop({ required: true, type: String, enum: USER_ROLES })
  role: UserRole

  /** Apenas médicos, ex.: "CRM-SP 123456" */
  @Prop()
  crm?: string

  @Prop()
  specialty?: string

  @Prop()
  phone?: string

  /** Unidade de saúde (médico) ou órgão (gestor) */
  @Prop()
  institution?: string
}

export type UserDocument = HydratedDocument<User>
export const UserSchema = SchemaFactory.createForClass(User)

// Únicos só entre quem tem o campo (sparse): pacientes não têm e-mail, médicos não têm CPF
UserSchema.index({ email: 1 }, { unique: true, sparse: true })
UserSchema.index({ cpf: 1 }, { unique: true, sparse: true })
