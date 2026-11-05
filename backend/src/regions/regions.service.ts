import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { Region } from './region.schema.js'
import type { RegionalDataQuery } from './regional-data.query.js'
import { RegionalStat } from './regional-stat.schema.js'

export const INVALID_REGION = 'Região inválida.'

@Injectable()
export class RegionsService {
  constructor(
    @InjectModel(Region.name) private readonly regionModel: Model<Region>,
    @InjectModel(RegionalStat.name) private readonly regionalStatModel: Model<RegionalStat>,
  ) {}

  /** Nomes das regiões, na ordem de exibição */
  async names(): Promise<string[]> {
    const regions = await this.regionModel.find({}, { name: 1 }).sort({ order: 1 }).lean().exec()
    return regions.map((r) => r.name)
  }

  async exists(name: string): Promise<boolean> {
    return (await this.regionModel.exists({ name })) !== null
  }

  /**
   * Linhas agregadas (uma por região por mês), ordenadas por região e mês.
   * Só números: nenhum dado que identifique paciente sai daqui.
   */
  async regionalData({ region, from, to }: RegionalDataQuery) {
    if (from && to && from > to) {
      throw new BadRequestException('O mês inicial não pode ser depois do mês final.')
    }
    if (region && !(await this.exists(region))) throw new BadRequestException(INVALID_REGION)

    const month: Record<string, string> = {}
    if (from) month.$gte = from
    if (to) month.$lte = to
    const filter = {
      ...(region ? { region } : {}),
      ...(from || to ? { month } : {}),
    }

    return this.regionalStatModel
      .find(filter, { _id: 0, region: 1, month: 1, appointments: 1, uniquePatients: 1, conditions: 1 })
      .sort({ region: 1, month: 1 })
      .lean()
      .exec()
  }
}
