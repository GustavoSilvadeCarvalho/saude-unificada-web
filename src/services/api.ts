// Camada única de acesso a dados.
// Cada função verifica VITE_USE_MOCK: se "true", usa os dados de src/mocks com um
// pequeno atraso simulado; se "false", faz a requisição para VITE_API_URL.
// Os endpoints usados aqui estão documentados em API_CONTRACT.md.

import { db, persistDb } from '../mocks/db'
import { REGIONS, mockRegionalData } from '../mocks/regional'
import { mockUsers } from '../mocks/users'
import type {
  Allergy,
  Appointment,
  AppointmentSummary,
  AttachedDocument,
  AuthResponse,
  ClinicalCondition,
  CreateAppointmentInput,
  CreatePatientInput,
  DocumentUpload,
  Medication,
  Patient,
  RegionalFilters,
  RegionalRecord,
} from '../types'
import { onlyDigits } from '../utils/cpf'
import { generateId } from '../utils/format'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
const MOCK_DELAY_MS = 400

/** Erro padronizado da API (também lançado pelo mock) */
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* ---------- Token de autenticação ---------- */

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

/* ---------- Helpers ---------- */

/** Simula a latência da rede e devolve uma cópia (evita mutação acidental do "banco") */
function mockResponse<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(structuredClone(value)), ms))
}

function mockError(status: number, message: string, ms = MOCK_DELAY_MS): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new ApiError(status, message)), ms))
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  // Em uploads (FormData) o navegador define o Content-Type com o boundary
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  if (!response.ok) {
    let message = `Erro ${response.status} ao acessar a API`
    try {
      const body = await response.json()
      if (body?.message) message = body.message
    } catch {
      // corpo vazio ou não-JSON
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/* ---------- Autenticação ---------- */

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (USE_MOCK) {
    const found = mockUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    )
    if (!found) return mockError(401, 'E-mail ou senha inválidos.')
    const { password: _password, ...user } = found
    return mockResponse({ token: `mock-token-${user.id}`, user })
  }
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

/* ---------- Atendimentos ---------- */

export async function getAppointmentsByDoctor(doctorId: string): Promise<Appointment[]> {
  if (USE_MOCK) {
    const list = db.appointments
      .filter((a) => a.doctorId === doctorId)
      .sort((a, b) => a.date.localeCompare(b.date))
    return mockResponse(list)
  }
  return request<Appointment[]>(`/appointments?doctorId=${encodeURIComponent(doctorId)}`)
}

export async function getAppointmentsByPatient(cpf: string): Promise<Appointment[]> {
  const cleanCpf = onlyDigits(cpf)
  if (USE_MOCK) {
    const list = db.appointments
      .filter((a) => a.patientCpf === cleanCpf)
      .sort((a, b) => b.date.localeCompare(a.date))
    return mockResponse(list)
  }
  return request<Appointment[]>(`/appointments?patientCpf=${cleanCpf}`)
}

/**
 * Registra um atendimento e atualiza o prontuário (alergias, medicamentos, condições).
 * Os arquivos são enviados depois, um a um, como multipart/form-data.
 */
export async function createAppointment(
  input: CreateAppointmentInput,
  uploads: DocumentUpload[] = [],
): Promise<Appointment> {
  if (USE_MOCK) return mockCreateAppointment(input, uploads)

  const appointment = await request<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  for (const upload of uploads) {
    const form = new FormData()
    form.append('file', upload.file)
    form.append('type', upload.type)
    const document = await request<AttachedDocument>(`/appointments/${appointment.id}/documents`, {
      method: 'POST',
      body: form,
    })
    appointment.documents.push(document)
  }
  return appointment
}

function mockCreateAppointment(input: CreateAppointmentInput, uploads: DocumentUpload[]): Promise<Appointment> {
  const patient = db.patients.find((p) => p.cpf === input.patientCpf)
  const doctor = mockUsers.find((u) => u.id === input.doctorId)
  if (!patient) return mockError(404, 'Paciente não encontrado.')
  if (!doctor) return mockError(404, 'Médico não encontrado.')

  const now = new Date().toISOString()
  // No mock guardamos apenas o nome do arquivo e a data do upload
  const documents: AttachedDocument[] = uploads.map((u) => ({
    id: generateId('doc'),
    fileName: u.file.name,
    type: u.type,
    uploadedAt: now,
  }))

  let appointment = input.scheduledAppointmentId
    ? db.appointments.find((a) => a.id === input.scheduledAppointmentId)
    : undefined

  if (appointment) {
    Object.assign(appointment, {
      date: input.date,
      status: input.status,
      reason: input.reason || appointment.reason,
      summary: input.summary,
      documents: [...appointment.documents, ...documents],
    })
  } else {
    appointment = {
      id: generateId('at'),
      patientCpf: patient.cpf,
      patientName: patient.fullName,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: input.date,
      status: input.status,
      reason: input.reason,
      summary: input.summary,
      documents,
    }
    db.appointments.push(appointment)
  }

  // Atualizações do prontuário
  const newAllergies: Allergy[] = input.newAllergies.map((a) => ({ ...a, id: generateId('al') }))
  const newMedications: Medication[] = input.newMedications.map((m) => ({
    ...m,
    id: generateId('md'),
    prescribedBy: m.prescribedBy ?? doctor.name,
  }))
  const newConditions: ClinicalCondition[] = input.newConditions.map((c) => ({ ...c, id: generateId('cc') }))
  patient.allergies.push(...newAllergies)
  patient.activeMedications.push(...newMedications)
  patient.clinicalConditions.push(...newConditions)

  // Laudos e exames anexados também aparecem na seção de exames do prontuário
  for (const doc of documents.filter((d) => d.type === 'laudo' || d.type === 'exame')) {
    patient.exams.push({
      id: generateId('ex'),
      name: doc.type === 'laudo' ? 'Laudo anexado' : 'Exame anexado',
      date: input.date.slice(0, 10),
      result: 'Ver arquivo anexado',
      fileName: doc.fileName,
    })
  }

  persistDb()
  return mockResponse(appointment)
}

/* ---------- Pacientes ---------- */

/** Resumo dos atendimentos realizados, montado a partir da lista de atendimentos (mock) */
function buildSummaries(cpf: string): AppointmentSummary[] {
  return db.appointments
    .filter((a) => a.patientCpf === cpf && a.status === 'realizado')
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((a) => ({
      appointmentId: a.id,
      date: a.date,
      doctorName: a.doctorName,
      specialty: mockUsers.find((u) => u.id === a.doctorId)?.specialty,
      summary: a.summary,
    }))
}

/** Busca o prontuário pelo CPF. Retorna null se o paciente não existir. */
export async function getPatientByCpf(cpf: string): Promise<Patient | null> {
  const cleanCpf = onlyDigits(cpf)
  if (USE_MOCK) {
    const patient = db.patients.find((p) => p.cpf === cleanCpf)
    if (!patient) return mockResponse(null)
    return mockResponse({ ...patient, appointmentSummaries: buildSummaries(cleanCpf) })
  }
  try {
    return await request<Patient>(`/patients/${cleanCpf}`)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const data = { ...input, cpf: onlyDigits(input.cpf) }
  if (USE_MOCK) {
    if (db.patients.some((p) => p.cpf === data.cpf)) {
      return mockError(409, 'Já existe um paciente cadastrado com este CPF.')
    }
    const patient: Patient = {
      ...data,
      allergies: [],
      activeMedications: [],
      procedures: [],
      exams: [],
      clinicalConditions: [],
      appointmentSummaries: [],
    }
    db.patients.push(patient)
    persistDb()
    return mockResponse(patient)
  }
  return request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) })
}

/* ---------- Dados regionais (gestor) ---------- */

export async function getRegions(): Promise<string[]> {
  if (USE_MOCK) return mockResponse(REGIONS, 150)
  return request<string[]>('/regions')
}

export async function getRegionalData(filters: RegionalFilters = {}): Promise<RegionalRecord[]> {
  if (USE_MOCK) {
    const list = mockRegionalData.filter(
      (r) =>
        (!filters.region || r.region === filters.region) &&
        (!filters.from || r.month >= filters.from) &&
        (!filters.to || r.month <= filters.to),
    )
    return mockResponse(list)
  }
  const params = new URLSearchParams()
  if (filters.region) params.set('region', filters.region)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  return request<RegionalRecord[]>(`/regional-data?${params}`)
}
