import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, type Model, Types } from 'mongoose'
import { Appointment } from '../appointments/appointment.schema.js'
import { AuditLog } from '../audit/audit-log.schema.js'
import type { AuthUser } from '../common/roles.js'
import { UsersService } from '../users/users.service.js'
import { AccessBlock } from './access-block.schema.js'

export const BLOCKED_BY_PATIENT = 'O paciente bloqueou o seu acesso a este prontuário.'
const DOCTOR_NOT_FOUND = 'Médico não encontrado.'

/** Controle de privacidade: o paciente decide quais médicos podem abrir o prontuário dele */
@Injectable()
export class PrivacyService {
  constructor(
    @InjectModel(AccessBlock.name) private readonly blockModel: Model<AccessBlock>,
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>,
    private readonly usersService: UsersService,
  ) {}

  /** Chamado antes de qualquer acesso de médico ao prontuário, histórico ou documentos */
  async assertCanAccess(user: AuthUser, patientCpf: string) {
    if (user.role !== 'medico') return
    const blocked = await this.blockModel.exists({ patientCpf, doctorId: new Types.ObjectId(user.id) })
    if (blocked) throw new ForbiddenException(BLOCKED_BY_PATIENT)
  }

  /**
   * Médicos ligados ao paciente: os que atenderam (ou vão atender), os que abriram o prontuário
   * e os já bloqueados. É a lista que o app mostra para o paciente escolher quem bloquear.
   */
  async doctors(patientCpf: string) {
    const [fromAppointments, fromAudit, blocks] = await Promise.all([
      this.appointmentModel.distinct('doctorId', { patientCpf }).exec(),
      this.auditModel.distinct('userId', { patientCpf, userRole: 'medico' }).exec(),
      this.blockModel.find({ patientCpf }).exec(),
    ])
    const blockedAt = new Map(blocks.map((b) => [String(b.doctorId), b.blockedAt]))
    const ids = [...new Set([...fromAppointments, ...fromAudit, ...blocks.map((b) => b.doctorId)].map(String))]
    const doctors = await this.usersService.findDoctors(ids)

    return doctors
      .map((d) => ({
        doctorId: String(d._id),
        name: d.name,
        specialty: d.specialty,
        crm: d.crm,
        blocked: blockedAt.has(String(d._id)),
        blockedAt: blockedAt.get(String(d._id))?.toISOString(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  /** Bloqueia (repetir não dá erro) */
  async block(patientCpf: string, doctorId: string) {
    await this.findDoctor(doctorId)
    await this.blockModel
      .updateOne(
        { patientCpf, doctorId: new Types.ObjectId(doctorId) },
        { $setOnInsert: { patientCpf, doctorId: new Types.ObjectId(doctorId) } },
        { upsert: true },
      )
      .exec()
    return this.entry(patientCpf, doctorId)
  }

  /** Libera de novo (se não estava bloqueado, não faz nada) */
  async unblock(patientCpf: string, doctorId: string) {
    await this.findDoctor(doctorId)
    await this.blockModel.deleteOne({ patientCpf, doctorId: new Types.ObjectId(doctorId) }).exec()
    return this.entry(patientCpf, doctorId)
  }

  private async entry(patientCpf: string, doctorId: string) {
    const list = await this.doctors(patientCpf)
    return list.find((d) => d.doctorId === doctorId)
  }

  private async findDoctor(doctorId: string) {
    if (!isValidObjectId(doctorId)) throw new NotFoundException(DOCTOR_NOT_FOUND)
    const [doctor] = await this.usersService.findDoctors([doctorId])
    if (!doctor) throw new NotFoundException(DOCTOR_NOT_FOUND)
    return doctor
  }
}
