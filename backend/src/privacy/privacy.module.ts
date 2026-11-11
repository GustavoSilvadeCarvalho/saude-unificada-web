import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Appointment, AppointmentSchema } from '../appointments/appointment.schema.js'
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema.js'
import { UsersModule } from '../users/users.module.js'
import { AccessBlock, AccessBlockSchema } from './access-block.schema.js'
import { PrivacyService } from './privacy.service.js'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AccessBlock.name, schema: AccessBlockSchema },
      // Lidos para montar a lista de médicos ligados ao paciente
      { name: Appointment.name, schema: AppointmentSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    UsersModule,
  ],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
