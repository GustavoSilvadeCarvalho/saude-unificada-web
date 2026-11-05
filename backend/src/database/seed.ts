import 'reflect-metadata'
import { pathToFileURL } from 'node:url'
import bcrypt from 'bcryptjs'
import mongoose, { type Connection, type Model, type Schema } from 'mongoose'
import { Appointment, AppointmentSchema } from '../appointments/appointment.schema.js'
import { AuditLog, AuditLogSchema } from '../audit/audit-log.schema.js'
import { loadEnvFile } from '../common/env.js'
import { todayDateOnly } from '../common/validators.js'
import { Patient, PatientSchema } from '../patients/patient.schema.js'
import { User, UserSchema } from '../users/user.schema.js'
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

/**
 * Limpa as coleções e insere os dados de teste.
 * Usado pelo `npm run seed`, pelo `npm run dev:memory` e pelos testes e2e.
 */
export async function runSeed(connection: Connection) {
  const userModel = getModel(connection, User.name, UserSchema)
  const patientModel = getModel(connection, Patient.name, PatientSchema)
  const appointmentModel = getModel(connection, Appointment.name, AppointmentSchema)
  const auditModel = getModel(connection, AuditLog.name, AuditLogSchema)
  // Garante os índices (ex.: e-mail e CPF únicos) antes de inserir
  await Promise.all([userModel.init(), patientModel.init(), appointmentModel.init(), auditModel.init()])

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)
  await userModel.deleteMany({})
  const users = await userModel.insertMany(seedUsers.map((user) => ({ ...user, passwordHash })))

  await patientModel.deleteMany({})
  await patientModel.insertMany(seedPatients)

  // Atendimentos: liga médico (por e-mail) e paciente (por CPF) aos registros criados acima
  const doctorByEmail = new Map(users.map((u) => [u.email, u]))
  const patientNameByCpf = new Map(seedPatients.map((p) => [p.cpf, p.fullName]))
  await appointmentModel.deleteMany({})
  await appointmentModel.insertMany(
    seedAppointments.map((a) => {
      const doctor = doctorByEmail.get(a.doctorEmail)
      const patientCpf = SEED_CPFS[a.patient]
      return {
        patientCpf,
        patientName: patientNameByCpf.get(patientCpf),
        doctorId: doctor._id,
        doctorName: doctor.name,
        date: brasiliaDateTime(a),
        status: a.status,
        reason: a.reason,
        summary: a.summary,
      }
    }),
  )

  // A trilha de auditoria começa vazia a cada seed
  await auditModel.deleteMany({})

  return { users: seedUsers.length, patients: seedPatients.length, appointments: seedAppointments.length }
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
    const result = await runSeed(connection)
    console.log(
      `Seed concluído: ${result.users} usuários (senha de todos: ${SEED_PASSWORD}), ${result.patients} pacientes e ${result.appointments} atendimentos.`,
    )
  } finally {
    await connection.close()
  }
}
