import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { type ClientSession, isValidObjectId, type Model, Types } from 'mongoose'
import { AuditService } from '../audit/audit.service.js'
import type { AuthUser } from '../common/roles.js'
import { TransactionRunner } from '../database/transaction.runner.js'
import { Patient } from '../patients/patient.schema.js'
import { CLOCK_TOLERANCE_MS, MIN_SUMMARY_LENGTH } from './appointment.constants.js'
import { Appointment, type AppointmentDocument } from './appointment.schema.js'
import type { CreateAppointmentDto } from './create-appointment.dto.js'
import type { ListAppointmentsQuery } from './list-appointments.query.js'

const APPOINTMENT_NOT_FOUND = 'Agendamento não encontrado.'

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    private readonly auditService: AuditService,
    private readonly transactions: TransactionRunner,
  ) {}

  /** Agenda do médico (data crescente) ou histórico do paciente (data decrescente) */
  async list(query: ListAppointmentsQuery, user: AuthUser) {
    const { doctorId, patientCpf } = query
    if (!doctorId && !patientCpf) throw new BadRequestException('Informe doctorId ou patientCpf.')
    if (doctorId && patientCpf) throw new BadRequestException('Informe só um filtro: doctorId ou patientCpf.')

    if (doctorId) {
      if (doctorId !== user.id) throw new ForbiddenException('Você só pode ver a sua própria agenda.')
      return this.appointmentModel.find({ doctorId: new Types.ObjectId(doctorId) }).sort({ date: 1 }).exec()
    }

    const cpf = patientCpf as string
    const appointments = await this.appointmentModel.find({ patientCpf: cpf }).sort({ date: -1 }).exec()
    await this.auditService.record(user, 'appointments.view', cpf)
    return appointments
  }

  /**
   * Registra um atendimento e atualiza o prontuário numa transação só:
   * se qualquer parte falhar, nada fica gravado pela metade.
   */
  async create(dto: CreateAppointmentDto, user: AuthUser) {
    if (dto.doctorId !== user.id) {
      throw new ForbiddenException('Você só pode registrar atendimentos em seu próprio nome.')
    }
    this.checkRules(dto)

    const newAllergies = dto.newAllergies ?? []
    const newMedications = (dto.newMedications ?? []).map((m) => ({ ...m, prescribedBy: m.prescribedBy ?? user.name }))
    const newConditions = dto.newConditions ?? []

    return this.transactions.run(async (session) => {
      const patient = await this.patientModel.findOne({ cpf: dto.patientCpf }).session(session).exec()
      if (!patient) throw new NotFoundException('Paciente não encontrado.')

      let appointment: AppointmentDocument
      if (dto.scheduledAppointmentId) {
        appointment = await this.findScheduled(dto.scheduledAppointmentId, patient.cpf, user, session)
        appointment.set({
          date: new Date(dto.date),
          status: dto.status,
          reason: dto.reason ?? appointment.reason,
          summary: dto.summary,
          instructions: dto.instructions ?? appointment.instructions,
        })
        await appointment.save({ session })
      } else {
        const [created] = await this.appointmentModel.create(
          [
            {
              patientCpf: patient.cpf,
              patientName: patient.fullName,
              doctorId: new Types.ObjectId(user.id),
              doctorName: user.name,
              date: new Date(dto.date),
              status: dto.status,
              reason: dto.reason,
              summary: dto.summary,
              instructions: dto.instructions,
            },
          ],
          { session },
        )
        appointment = created
      }

      // O prontuário só muda em atendimento realizado (checkRules garante listas vazias no agendamento)
      if (newAllergies.length + newMedications.length + newConditions.length > 0) {
        patient.allergies.push(...newAllergies)
        patient.activeMedications.push(...newMedications)
        patient.clinicalConditions.push(...newConditions)
        await patient.save({ session })
      }

      await this.auditService.record(user, 'appointment.create', patient.cpf, session)
      return appointment.toJSON()
    })
  }

  /** Mesmas regras do formulário do site, para a API não depender do front */
  private checkRules(dto: CreateAppointmentDto) {
    const time = new Date(dto.date).getTime()
    const now = Date.now()

    if (dto.status === 'realizado') {
      if (time > now + CLOCK_TOLERANCE_MS) {
        throw new BadRequestException('Um atendimento realizado não pode ter data no futuro.')
      }
      if (dto.summary.length < MIN_SUMMARY_LENGTH) {
        throw new BadRequestException(`Descreva o atendimento (mínimo de ${MIN_SUMMARY_LENGTH} caracteres).`)
      }
      return
    }

    if (time < now - CLOCK_TOLERANCE_MS) throw new BadRequestException('Um agendamento precisa ter data no futuro.')
    const changes = (dto.newAllergies?.length ?? 0) + (dto.newMedications?.length ?? 0) + (dto.newConditions?.length ?? 0)
    if (changes > 0) {
      throw new BadRequestException(
        'Um agendamento não altera o prontuário: alergias, medicamentos e condições só entram em atendimento realizado.',
      )
    }
  }

  /** Agendamento que vai ser concluído ou remarcado: precisa ser do mesmo médico e paciente */
  private async findScheduled(
    id: string,
    patientCpf: string,
    user: AuthUser,
    session: ClientSession | null,
  ): Promise<AppointmentDocument> {
    if (!isValidObjectId(id)) throw new NotFoundException(APPOINTMENT_NOT_FOUND)
    const appointment = await this.appointmentModel.findById(id).session(session).exec()
    if (!appointment) throw new NotFoundException(APPOINTMENT_NOT_FOUND)
    if (!appointment.doctorId.equals(user.id)) throw new ForbiddenException('Este agendamento é de outro médico.')
    if (appointment.patientCpf !== patientCpf) throw new BadRequestException('Este agendamento é de outro paciente.')
    if (appointment.status === 'realizado') throw new ConflictException('Este atendimento já foi registrado.')
    return appointment
  }
}
