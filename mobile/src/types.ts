// Tipos das entidades: funcionam como contrato entre o app e a API.
// Mantenha este arquivo sincronizado com o docs/API_CONTRACT.md (raiz do monorepo).
// Aqui está só o que o app do paciente usa (seção 5 do contrato).

/* ---------- Usuário e autenticação ---------- */

/** O paciente entra pelo CPF, como no app do gov.br (docs/API_CONTRACT.md, seção 5) */
export interface PatientUser {
  id: string
  name: string
  role: 'paciente'
  /** Apenas dígitos (11 caracteres) */
  cpf: string
}

export interface AuthResponse {
  token: string
  user: PatientUser
}

export interface PatientRegisterInput {
  /** Com ou sem máscara */
  cpf: string
  /** AAAA-MM-DD */
  birthDate: string
  password: string
}

/* ---------- Prontuário (GET /me/record) ---------- */

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Não informado'
export type AllergySeverity = 'leve' | 'moderada' | 'grave'
export type ConditionStatus = 'ativa' | 'controlada' | 'resolvida'

export interface Allergy {
  id: string
  substance: string
  severity: AllergySeverity
  reaction?: string
  /** AAAA-MM-DD */
  recordedAt: string
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  startDate: string
  prescribedBy?: string
}

export interface Procedure {
  id: string
  name: string
  /** AAAA-MM-DD */
  date: string
  location?: string
  notes?: string
}

export interface ExamReport {
  id: string
  name: string
  /** AAAA-MM-DD */
  date: string
  result: string
  fileName?: string
}

export interface ClinicalCondition {
  id: string
  name: string
  /** CID-10, ex.: "I10" */
  cid?: string
  diagnosedAt: string
  status: ConditionStatus
}

export interface AppointmentSummary {
  appointmentId: string
  /** ISO 8601 */
  date: string
  doctorName: string
  specialty?: string
  summary: string
}

export interface Patient {
  cpf: string
  fullName: string
  birthDate: string
  sex: 'F' | 'M' | 'Outro'
  bloodType: BloodType
  phone?: string
  email?: string
  /** Região de saúde de residência */
  region: string
  allergies: Allergy[]
  activeMedications: Medication[]
  procedures: Procedure[]
  exams: ExamReport[]
  clinicalConditions: ClinicalCondition[]
  appointmentSummaries: AppointmentSummary[]
}

/* ---------- Atendimentos (GET /me/appointments) ---------- */

export type AppointmentStatus = 'realizado' | 'agendado'
export type DocumentType = 'receita' | 'laudo' | 'exame' | 'outro'

export interface AttachedDocument {
  id: string
  fileName: string
  type: DocumentType
  uploadedAt: string
}

export interface Appointment {
  id: string
  patientCpf: string
  patientName: string
  doctorId: string
  doctorName: string
  /** ISO 8601 */
  date: string
  status: AppointmentStatus
  reason?: string
  summary: string
  documents: AttachedDocument[]
}

/* ---------- LGPD (GET /me/access-log) ---------- */

export interface AccessLogEntry {
  at: string
  description: string
  userName: string
  userRole: string
  action: string
}

/* ---------- Download de documentos (5.6) ---------- */

export interface DownloadUrlResponse {
  /** Válido por 5 minutos, sem token */
  url: string
  expiresAt: string
}
