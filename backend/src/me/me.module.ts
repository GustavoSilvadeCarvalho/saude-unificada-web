import { Module } from '@nestjs/common'
import { AppointmentsModule } from '../appointments/appointments.module.js'
import { AuditModule } from '../audit/audit.module.js'
import { PatientsModule } from '../patients/patients.module.js'
import { MeController } from './me.controller.js'
import { MeService } from './me.service.js'

/** Rotas do app do paciente (/me): só leitura dos próprios dados */
@Module({
  imports: [PatientsModule, AppointmentsModule, AuditModule],
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
