import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from './auth/auth.module.js'
import { HealthModule } from './health/health.module.js'
import { PatientsModule } from './patients/patients.module.js'
import { UsersModule } from './users/users.module.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ uri: config.getOrThrow<string>('MONGODB_URI') }),
    }),
    UsersModule,
    AuthModule,
    HealthModule,
    PatientsModule,
  ],
})
export class AppModule {}
