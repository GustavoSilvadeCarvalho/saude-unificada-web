import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import type { HydratedDocument } from 'mongoose'
import { USER_ROLES, type UserRole } from '../common/roles.js'
import { jsonSchemaOptions } from '../common/schema-options.js'

/** Profissional de saúde ou gestor público (pacientes usam o app) */
@Schema({ ...jsonSchemaOptions, collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string

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
