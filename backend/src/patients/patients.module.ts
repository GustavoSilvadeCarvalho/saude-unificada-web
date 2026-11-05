import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuditModule } from '../audit/audit.module.js'
import { Patient, PatientSchema } from './patient.schema.js'
import { PatientsController } from './patients.controller.js'
import { PatientsService } from './patients.service.js'

@Module({
  imports: [MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]), AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
