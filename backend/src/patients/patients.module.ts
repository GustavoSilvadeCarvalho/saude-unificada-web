import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Appointment, AppointmentSchema } from '../appointments/appointment.schema.js'
import { AuditModule } from '../audit/audit.module.js'
import { PrivacyModule } from '../privacy/privacy.module.js'
import { RegionsModule } from '../regions/regions.module.js'
import { UsersModule } from '../users/users.module.js'
import { Patient, PatientSchema } from './patient.schema.js'
import { PatientsController } from './patients.controller.js'
import { PatientsService } from './patients.service.js'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      // Lido para montar o resumo dos atendimentos do prontuário
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    AuditModule,
    UsersModule,
    RegionsModule,
    PrivacyModule,
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
