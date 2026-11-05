import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { type Model, Types } from 'mongoose'
import type { AuthUser } from '../common/roles.js'
import { type AuditAction, AuditLog } from './audit-log.schema.js'

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLog>) {}

  /** Registra que o usuário fez a ação no prontuário do CPF */
  async record(user: AuthUser, action: AuditAction, patientCpf: string): Promise<void> {
    await this.auditModel.create({
      userId: new Types.ObjectId(user.id),
      userName: user.name,
      userRole: user.role,
      action,
      patientCpf,
    })
  }

  /** Acessos a um prontuário, do mais recente ao mais antigo */
  findByPatient(patientCpf: string, limit = 50) {
    return this.auditModel.find({ patientCpf }).sort({ at: -1 }).limit(limit).exec()
  }
}
