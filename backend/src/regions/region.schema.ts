import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

/** Região de saúde (ex.: "Campinas"). É a lista usada no cadastro de paciente e no painel do gestor */
@Schema({ collection: 'regions', versionKey: false })
export class Region {
  @Prop({ required: true, unique: true, trim: true })
  name: string

  /** Posição na lista (as regiões aparecem nesta ordem no site) */
  @Prop({ required: true })
  order: number
}

export const RegionSchema = SchemaFactory.createForClass(Region)
