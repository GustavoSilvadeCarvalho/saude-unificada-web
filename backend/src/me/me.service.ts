import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import { Appointment } from '../appointments/appointment.schema.js'
import type { AuditAction } from '../audit/audit-log.schema.js'
import { AuditService } from '../audit/audit.service.js'
import type { AuthUser } from '../common/roles.js'
import { PatientsService } from '../patients/patients.service.js'
import type { MyAppointmentsQuery } from './me.query.js'

/** Como cada ação aparece para o paciente na lista de acessos */
const ACTION_DESCRIPTIONS: Record<AuditAction, string> = {
  'patient.view': 'Abriu o seu prontuário',
  'patient.create': 'Fez o seu cadastro',
  'appointments.view': 'Consultou o seu histórico de atendimentos',
  'appointment.create': 'Registrou um atendimento',
  'document.upload': 'Anexou um documento',
  'document.download': 'Baixou um documento',
}

/**
 * Dados do próprio paciente para o app. Tudo somente leitura: pelos requisitos,
 * o paciente não altera as próprias informações (quem atualiza é o profissional no atendimento).
 * O CPF vem do token, então ninguém consegue ver o prontuário de outra pessoa por aqui.
 */
@Injectable()
export class MeService {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly auditService: AuditService,
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
  ) {}

  /** Carteira digital de saúde: o prontuário completo */
  record(user: AuthUser) {
    return this.patientsService.record(this.cpf(user))
  }

  /** Histórico (realizados) e próximos atendimentos (agendados) */
  appointments(user: AuthUser, { status }: MyAppointmentsQuery) {
    const nextFirst = status === 'agendado'
    return this.appointmentModel
      .find({ patientCpf: this.cpf(user), ...(status ? { status } : {}) })
      .sort({ date: nextFirst ? 1 : -1 })
      .exec()
  }

  /** Exames e laudos, do mais recente ao mais antigo */
  async exams(user: AuthUser) {
    const record = await this.patientsService.record(this.cpf(user))
    return [...record.exams].sort((a, b) => b.date.localeCompare(a.date))
  }

  /** Quem acessou o prontuário e quando (LGPD: o titular acompanha o uso dos seus dados) */
  async accessLog(user: AuthUser) {
    const logs = await this.auditService.findByPatient(this.cpf(user), 100)
    return logs
      .filter((log) => log.userRole !== 'paciente')
      .map((log) => ({
        at: log.at.toISOString(),
        description: ACTION_DESCRIPTIONS[log.action],
        userName: log.userName,
        userRole: log.userRole,
        action: log.action,
      }))
  }

  private cpf(user: AuthUser): string {
    return user.cpf as string // as rotas /me são só do perfil paciente, que sempre tem CPF no token
  }
}
