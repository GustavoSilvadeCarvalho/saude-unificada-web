import 'reflect-metadata'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import mongoose, { type Connection, type Model, type Schema, Types } from 'mongoose'
import { Appointment, AppointmentSchema } from '../appointments/appointment.schema.js'
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema.js'
import { loadEnvFile } from '../common/env.js'
import { REGIONS } from '../common/regions.js'
import { todayDateOnly } from '../common/validators.js'
import { Patient, PatientSchema } from '../patients/patient.schema.js'
import { Region, RegionSchema } from '../regions/region.schema.js'
import { RegionalStat, RegionalStatSchema } from '../regions/regional-stat.schema.js'
import { createStorage } from '../storage/storage.factory.js'
import type { StorageService } from '../storage/storage.service.js'
import { User, UserSchema } from '../users/user.schema.js'
import { demoPdf } from './demo-pdf.js'
import { buildRegionalData } from './regional-data.js'
import { SEED_CPFS, SEED_PASSWORD, type SeedAppointment, seedAppointments, seedPatients, seedUsers } from './seed-data.js'

/**
 * Reaproveita o model se a conexão já tiver um (caso dos testes, que usam a conexão do Nest).
 * Sem genéricos de propósito: os tipos do Mongoose com genérico estouram a memória do tsc.
 */
function getModel(connection: Connection, name: string, schema: Schema): Model<any> {
  return connection.models[name] ?? (connection.model(name, schema) as unknown as Model<any>)
}

/** Data/hora a N dias de hoje, no horário de Brasília (UTC-3, sem horário de verão) */
function brasiliaDateTime({ daysFromNow, hour, minute = 0 }: SeedAppointment): Date {
  const [year, month, day] = todayDateOnly().split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + daysFromNow, hour + 3, minute))
}

const MINUTE = 60 * 1000

/**
 * Grava um PDF de demonstração para cada documento do atendimento e devolve os
 * subdocumentos prontos para o banco (mesma chave que a API usa nos uploads).
 */
async function seedDocuments(
  storage: StorageService,
  appointmentId: Types.ObjectId,
  appointment: SeedAppointment,
  info: { patientName: string; doctorName: string; date: Date },
) {
  return Promise.all(
    (appointment.documents ?? []).map(async (doc) => {
      const id = new Types.ObjectId()
      const storageKey = `appointments/${appointmentId}/${id}.pdf`
      const body = demoPdf(`Saúde Unificada — ${doc.type.toUpperCase()}`, [
        `Paciente: ${info.patientName}`,
        `Profissional: ${info.doctorName}`,
        `Atendimento: ${appointment.reason}`,
        `Arquivo: ${doc.fileName}`,
        '',
        'Documento fictício gerado pelo seed, apenas para demonstração.',
      ])
      await storage.put(storageKey, body, 'application/pdf')
      return {
        _id: id,
        fileName: doc.fileName,
        type: doc.type,
        uploadedAt: new Date(info.date.getTime() + doc.minutesAfter * MINUTE),
        storageKey,
        mimeType: 'application/pdf',
        size: body.length,
      }
    }),
  )
}

/**
 * Limpa as coleções e insere os dados de teste.
 * Usado pelo `npm run seed`, pelo `npm run dev:memory` e pelos testes e2e.
 */
export async function runSeed(connection: Connection, options: { storage?: StorageService } = {}) {
  const userModel = getModel(connection, User.name, UserSchema)
  const patientModel = getModel(connection, Patient.name, PatientSchema)
  const appointmentModel = getModel(connection, Appointment.name, AppointmentSchema)
  const auditModel = getModel(connection, AuditLog.name, AuditLogSchema)
  const regionModel = getModel(connection, Region.name, RegionSchema)
  const regionalStatModel = getModel(connection, RegionalStat.name, RegionalStatSchema)
  // Garante os índices (ex.: e-mail e CPF únicos) antes de inserir
  const models = [userModel, patientModel, appointmentModel, auditModel, regionModel, regionalStatModel]
  await Promise.all(models.map((model) => model.init()))

  // Regiões primeiro: o cadastro de paciente é validado por elas
  await regionModel.deleteMany({})
  await regionModel.insertMany(REGIONS.map((name, order) => ({ name, order })))
  const regionalData = buildRegionalData()
  await regionalStatModel.deleteMany({})
  await regionalStatModel.insertMany(regionalData)

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  await userModel.deleteMany({})
  const users = await userModel.insertMany(seedUsers.map((user) => ({ ...user, passwordHash })))

  await patientModel.deleteMany({})
  await patientModel.insertMany(seedPatients)

  // Atendimentos: liga médico (por e-mail) e paciente (por CPF) aos registros criados acima
  const doctorByEmail = new Map(users.map((u) => [u.email, u]))
  const patientNameByCpf = new Map(seedPatients.map((p) => [p.cpf, p.fullName]))
  await appointmentModel.deleteMany({})
  const appointments = await Promise.all(
    seedAppointments.map(async (a) => {
      const _id = new Types.ObjectId()
      const doctor = doctorByEmail.get(a.doctorEmail)
      const patientCpf = SEED_CPFS[a.patient]
      const patientName = patientNameByCpf.get(patientCpf) as string
      const date = brasiliaDateTime(a)
      // Sem armazenamento (ex.: só o banco), os atendimentos entram sem documentos
      const documents = options.storage
        ? await seedDocuments(options.storage, _id, a, { patientName, doctorName: doctor.name, date })
        : []
      return {
        _id,
        patientCpf,
        patientName,
        doctorId: doctor._id,
        doctorName: doctor.name,
        date,
        status: a.status,
        reason: a.reason,
        summary: a.summary,
        documents,
      }
    }),
  )
  await appointmentModel.insertMany(appointments)

  // A trilha de auditoria começa vazia a cada seed
  await auditModel.deleteMany({})

  return {
    users: seedUsers.length,
    patients: seedPatients.length,
    appointments: seedAppointments.length,
    regions: REGIONS.length,
    regionalStats: regionalData.length,
  }
}

// Execução direta: npm run seed (usa o MONGODB_URI do .env)
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  loadEnvFile()
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Defina MONGODB_URI no .env antes de rodar o seed.')
    process.exit(1)
  }
  const connection = await mongoose.createConnection(uri).asPromise()
  try {
    const result = await runSeed(connection, { storage: createStorage(process.env) })
    console.log(
      `Seed concluído: ${result.users} usuários (senha de todos: ${SEED_PASSWORD}), ${result.patients} pacientes, ` +
        `${result.appointments} atendimentos, ${result.regions} regiões e ${result.regionalStats} linhas de dados regionais.`,
    )
  } finally {
    await connection.close()
  }
}
