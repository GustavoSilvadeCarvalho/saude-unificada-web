import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuditModule } from '../audit/audit.module.js'
import { TransactionRunner } from '../database/transaction.runner.js'
import { Patient, PatientSchema } from '../patients/patient.schema.js'
import { Appointment, AppointmentSchema } from './appointment.schema.js'
import { AppointmentsController } from './appointments.controller.js'
import { AppointmentsService } from './appointments.service.js'
import { DocumentsController } from './documents.controller.js'
import { DocumentsService } from './documents.service.js'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      // O registro de atendimento atualiza o prontuário na mesma transação
      { name: Patient.name, schema: PatientSchema },
    ]),
    AuditModule,
  ],
  controllers: [AppointmentsController, DocumentsController],
  providers: [AppointmentsService, DocumentsService, TransactionRunner],
  // O app do paciente (MeModule) reaproveita o download e a leitura dos atendimentos
  exports: [DocumentsService, MongooseModule],
})
export class AppointmentsModule {}
