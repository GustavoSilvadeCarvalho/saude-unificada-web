import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { isValidObjectId, type Model, Types } from 'mongoose'
import { AuditService } from '../audit/audit.service.js'
import type { AuthUser } from '../common/roles.js'
import { cleanFileName, detectFileType } from '../common/uploads.js'
import { dateOnlyInBrasilia } from '../common/validators.js'
import { initials, newVerificationCode, normalizeVerificationCode, sha256 } from '../common/verification.js'
import { UsersService } from '../users/users.service.js'
import { TransactionRunner } from '../database/transaction.runner.js'
import { Patient } from '../patients/patient.schema.js'
import { StorageService } from '../storage/storage.service.js'
import type { DocumentType } from './appointment.constants.js'
import { Appointment, type AppointmentDocument } from './appointment.schema.js'

/** Máximo de documentos por atendimento */
export const MAX_DOCUMENTS = 20

const APPOINTMENT_NOT_FOUND = 'Atendimento não encontrado.'
const DOCUMENT_NOT_FOUND = 'Documento não encontrado.'
const NOT_VERIFIED = 'Nenhum documento com esse código. Confira o código impresso no documento.'

/** Laudos e exames anexados também aparecem na seção de exames do prontuário */
const EXAM_NAMES: Partial<Record<DocumentType, string>> = {
  laudo: 'Laudo anexado',
  exame: 'Exame anexado',
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)

  constructor(
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<Appointment>,
    @InjectModel(Patient.name) private readonly patientModel: Model<Patient>,
    private readonly storage: StorageService,
    private readonly auditService: AuditService,
    private readonly transactions: TransactionRunner,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Guarda o arquivo no armazenamento (S3 ou disco) e registra o documento no atendimento.
   * Se a gravação no banco falhar, o arquivo é apagado para não sobrar lixo no bucket.
   */
  async upload(appointmentId: string, file: Express.Multer.File | undefined, type: DocumentType, user: AuthUser) {
    if (!file) throw new BadRequestException('Envie o arquivo no campo "file".')
    if (file.size === 0) throw new BadRequestException('O arquivo está vazio.')
    const detected = detectFileType(file.buffer)
    if (!detected) throw new BadRequestException('Formato não aceito. Envie PDF, JPG ou PNG.')

    const appointment = await this.findAppointment(appointmentId)
    if (!appointment.doctorId.equals(user.id)) {
      throw new ForbiddenException('Só o médico do atendimento pode anexar documentos.')
    }
    if (appointment.documents.length >= MAX_DOCUMENTS) {
      throw new BadRequestException(`Limite de ${MAX_DOCUMENTS} documentos por atendimento.`)
    }

    const documentId = new Types.ObjectId()
    const fileName = cleanFileName(file.originalname, detected.extension)
    // A chave não usa o nome enviado pelo usuário (evita caracteres estranhos e colisões)
    const storageKey = `appointments/${appointment.id}/${documentId}${detected.extension}`
    await this.storage.put(storageKey, file.buffer, detected.mimeType)

    try {
      return await this.transactions.run(async (session) => {
        const current = await this.appointmentModel.findById(appointment._id).session(session).exec()
        if (!current) throw new NotFoundException(APPOINTMENT_NOT_FOUND)
        current.documents.push({
          _id: documentId,
          fileName,
          type,
          uploadedAt: new Date(),
          storageKey,
          mimeType: detected.mimeType,
          size: file.size,
          verificationCode: newVerificationCode(),
          sha256: sha256(file.buffer),
        })
        await current.save({ session })

        const examName = EXAM_NAMES[type]
        if (examName) {
          await this.patientModel
            .updateOne(
              { cpf: current.patientCpf },
              {
                $push: {
                  exams: {
                    name: examName,
                    date: dateOnlyInBrasilia(current.date),
                    result: 'Ver arquivo anexado',
                    fileName,
                    appointmentId: current.id,
                    documentId: String(documentId),
                  },
                },
              },
              { session: session ?? undefined },
            )
            .exec()
        }

        await this.auditService.record(user, 'document.upload', current.patientCpf, session)
        const saved = current.documents.find((d) => d._id?.equals(documentId))
        return (saved as unknown as { toJSON(): Record<string, unknown> }).toJSON()
      })
    } catch (error) {
      await this.storage.delete(storageKey).catch((cleanupError) => {
        this.logger.error(`Não foi possível apagar ${storageKey} depois de um upload com erro`, cleanupError)
      })
      throw error
    }
  }

  /**
   * Link temporário (5 min) para baixar o documento, sem precisar do token.
   * Qualquer médico pode baixar (o prontuário é unificado); o paciente, só os dele.
   * Cada download fica na auditoria.
   */
  async downloadLink(appointmentId: string, documentId: string, user: AuthUser, apiBaseUrl: string) {
    const appointment = await this.findAppointment(appointmentId)
    // O paciente só baixa os próprios documentos; de outro paciente responde como se não existisse
    if (user.role === 'paciente' && appointment.patientCpf !== user.cpf) {
      throw new NotFoundException(APPOINTMENT_NOT_FOUND)
    }
    const document = isValidObjectId(documentId)
      ? appointment.documents.find((d) => d._id?.equals(documentId))
      : undefined
    if (!document) throw new NotFoundException(DOCUMENT_NOT_FOUND)

    await this.auditService.record(user, 'document.download', appointment.patientCpf)
    return this.storage.downloadLink(document.storageKey, {
      fileName: document.fileName,
      mimeType: document.mimeType,
      apiBaseUrl,
    })
  }

  /**
   * Conferência pública (sem login): quem recebe a receita ou o laudo (farmácia, outro hospital)
   * digita o código impresso e vê quem emitiu e quando. Não mostra CPF nem nome completo.
   */
  async verify(code: string) {
    const normalized = normalizeVerificationCode(code)
    if (!normalized) throw new NotFoundException(NOT_VERIFIED)
    const appointment = await this.appointmentModel.findOne({ 'documents.verificationCode': normalized }).exec()
    const document = appointment?.documents.find((d) => d.verificationCode === normalized)
    if (!appointment || !document) throw new NotFoundException(NOT_VERIFIED)

    const doctor = await this.usersService.findById(String(appointment.doctorId))
    return {
      valid: true,
      verificationCode: normalized,
      type: document.type,
      fileName: document.fileName,
      issuedAt: document.uploadedAt.toISOString(),
      doctorName: appointment.doctorName,
      doctorCrm: doctor?.crm,
      patientInitials: initials(appointment.patientName),
      sha256: document.sha256 as string,
    }
  }

  private async findAppointment(id: string): Promise<AppointmentDocument> {
    if (!isValidObjectId(id)) throw new NotFoundException(APPOINTMENT_NOT_FOUND)
    const appointment = await this.appointmentModel.findById(id).exec()
    if (!appointment) throw new NotFoundException(APPOINTMENT_NOT_FOUND)
    return appointment
  }
}
