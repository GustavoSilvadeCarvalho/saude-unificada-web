import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Region, RegionSchema } from './region.schema.js'
import { RegionalStat, RegionalStatSchema } from './regional-stat.schema.js'
import { RegionsController } from './regions.controller.js'
import { RegionsService } from './regions.service.js'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Region.name, schema: RegionSchema },
      { name: RegionalStat.name, schema: RegionalStatSchema },
    ]),
  ],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
