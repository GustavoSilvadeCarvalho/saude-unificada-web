import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { AuditService } from '../audit/audit.service.js'
import type { AuthUser } from '../common/roles.js'
import type { CreatePatientDto } from './create-patient.dto.js'
import { Patient, type PatientDocument } from './patient.schema.js'

const NOT_FOUND = 'Paciente não encontrado.'
const DUPLICATED = 'Já existe um paciente cadastrado com este CPF.'

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    private readonly auditService: AuditService,
  ) {}

  /** Prontuário unificado. 404 se o CPF não existir (o front usa isso para oferecer o cadastro) */
  async getRecord(cpf: string, user: AuthUser) {
    const patient = await this.patientModel.findOne({ cpf }).exec()
    if (!patient) throw new NotFoundException(NOT_FOUND)

    await this.auditService.record(user, 'patient.view', cpf)
    return this.toRecord(patient)
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
    return this.toRecord(patient)
  }

  /** Formato do contrato: paciente + resumo dos atendimentos */
  private toRecord(patient: PatientDocument) {
    return {
      ...patient.toJSON(),
      // Preenchido no bloco 7, com os atendimentos realizados
      appointmentSummaries: [],
    }
  }
}
