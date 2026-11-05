import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { Appointment } from '../appointments/appointment.schema.js'
import { AuditService } from '../audit/audit.service.js'
import type { AuthUser } from '../common/roles.js'
import { UsersService } from '../users/users.service.js'
import type { CreatePatientDto } from './create-patient.dto.js'
import { Patient, type PatientDocument } from './patient.schema.js'

const NOT_FOUND = 'Paciente não encontrado.'
const DUPLICATED = 'Já existe um paciente cadastrado com este CPF.'

/** Quantos atendimentos realizados aparecem no resumo do prontuário */
const SUMMARY_LIMIT = 50

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
  ) {}

  /** Prontuário unificado. 404 se o CPF não existir (o front usa isso para oferecer o cadastro) */
  async getRecord(cpf: string, user: AuthUser) {
    const patient = await this.patientModel.findOne({ cpf }).exec()
    if (!patient) throw new NotFoundException(NOT_FOUND)

    await this.auditService.record(user, 'patient.view', cpf)
    return { ...patient.toJSON(), appointmentSummaries: await this.appointmentSummaries(cpf) }
  }

  async create(data: CreatePatientDto, user: AuthUser) {
    let patient: PatientDocument
    try {
      patient = await this.patientModel.create(data)
    } catch (error) {
      // Índice único do CPF (também cobre dois cadastros simultâneos do mesmo CPF)
      if ((error as { code?: number }).code === 11000) throw new ConflictException(DUPLICATED)
      throw error
    }

    await this.auditService.record(user, 'patient.create', patient.cpf)
    // Paciente recém-cadastrado ainda não tem atendimentos
    return { ...patient.toJSON(), appointmentSummaries: [] }
  }

  /** Atendimentos realizados, do mais recente ao mais antigo, com a especialidade do médico */
  private async appointmentSummaries(cpf: string) {
    const appointments = await this.appointmentModel
      .find({ patientCpf: cpf, status: 'realizado' }, { doctorId: 1, doctorName: 1, date: 1, summary: 1 })
      .sort({ date: -1 })
      .limit(SUMMARY_LIMIT)
      .lean()
      .exec()
    // Um id por médico (ObjectIds iguais são objetos diferentes, então deduplica pelo texto)
    const doctorIds = [...new Map(appointments.map((a) => [String(a.doctorId), a.doctorId])).values()]
    const specialties = await this.usersService.findSpecialties(doctorIds)

    return appointments.map((a) => ({
      appointmentId: String(a._id),
      date: a.date.toISOString(),
      doctorName: a.doctorName,
      specialty: specialties.get(String(a.doctorId)),
      summary: a.summary,
    }))
  }
}
