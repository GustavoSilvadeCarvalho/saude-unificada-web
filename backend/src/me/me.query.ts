import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '../appointments/appointment.constants.js'
import { EmptyToUndefined } from '../common/transforms.js'

export class MyAppointmentsQuery {
  @ApiPropertyOptional({
    enum: APPOINTMENT_STATUSES,
    description: 'realizado = histórico (mais recente primeiro); agendado = próximos (mais próximo primeiro); vazio = todos',
  })
  @EmptyToUndefined()
  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES, { message: 'Situação inválida. Use realizado ou agendado.' })
  status?: AppointmentStatus
}
