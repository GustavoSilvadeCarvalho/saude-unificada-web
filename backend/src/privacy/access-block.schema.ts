import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { type HydratedDocument, Types } from 'mongoose'
import { jsonSchemaOptions } from '../common/schema-options.js'

/**
 * O paciente bloqueou o acesso de um médico ao prontuário (requisito "controle de privacidade
 * para o paciente gerenciar quem acessa seus dados"). Enquanto existir, o médico recebe 403.
 */
@Schema({ ...jsonSchemaOptions, collection: 'access_blocks', timestamps: { createdAt: 'blockedAt', updatedAt: false } })
export class AccessBlock {
  @Prop({ required: true })
  patientCpf: string

  @Prop({ required: true, type: Types.ObjectId })
  doctorId: Types.ObjectId

  blockedAt: Date
}

export type AccessBlockDocument = HydratedDocument<AccessBlock>
export const AccessBlockSchema = SchemaFactory.createForClass(AccessBlock)
AccessBlockSchema.index({ patientCpf: 1, doctorId: 1 }, { unique: true })
