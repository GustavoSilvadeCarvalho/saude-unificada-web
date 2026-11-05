import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

@Schema({ _id: false })
export class ConditionCount {
  @Prop({ required: true })
  name: string

  @Prop({ required: true, min: 0 })
  count: number
}
export const ConditionCountSchema = SchemaFactory.createForClass(ConditionCount)

/**
 * Totais de uma região num mês, já agregados e anônimos (sem CPF, nome ou qualquer dado
 * que identifique o paciente). É o que o gestor público vê no painel.
 */
@Schema({ collection: 'regional_stats', versionKey: false })
export class RegionalStat {
  @Prop({ required: true })
  region: string

  /** AAAA-MM */
  @Prop({ required: true })
  month: string

  @Prop({ required: true, min: 0 })
  appointments: number

  @Prop({ required: true, min: 0 })
  uniquePatients: number

  @Prop({ type: [ConditionCountSchema], default: [] })
  conditions: ConditionCount[]
}

export const RegionalStatSchema = SchemaFactory.createForClass(RegionalStat)

// Uma linha por região por mês; a consulta filtra e ordena por esses dois campos
RegionalStatSchema.index({ region: 1, month: 1 }, { unique: true })
