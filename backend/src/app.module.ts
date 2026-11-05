import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AppointmentsModule } from './appointments/appointments.module.js'
import { AuthModule } from './auth/auth.module.js'
import { HealthModule } from './health/health.module.js'
import { PatientsModule } from './patients/patients.module.js'
import { RegionsModule } from './regions/regions.module.js'
import { StorageModule } from './storage/storage.module.js'
import { UsersModule } from './users/users.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
    }),
    StorageModule,
    UsersModule,
    AuthModule,
    HealthModule,
    PatientsModule,
    AppointmentsModule,
    RegionsModule,
  ],
})
export class AppModule {}
