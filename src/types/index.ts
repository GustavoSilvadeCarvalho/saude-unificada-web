// Tipos das entidades: funcionam como contrato entre o front-end e a API.
// Mantenha este arquivo sincronizado com o API_CONTRACT.md.

/* ---------- Usuários e autenticação ---------- */

export type UserRole = 'medico' | 'gestor'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  /** Apenas para médicos, ex.: "CRM-SP 123456" */
  crm?: string
  /** Apenas para médicos */
  specialty?: string
  phone?: string
  /** Unidade de saúde (médico) ou órgão (gestor) */
  institution?: string
}

export interface AuthResponse {
  token: string
  user: User
}

/* ---------- Paciente / prontuário ---------- */

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Não informado'

export type AllergySeverity = 'leve' | 'moderada' | 'grave'

export interface Allergy {
  id: string
  substance: string
  severity: AllergySeverity
  reaction?: string
  /** Data ISO (AAAA-MM-DD) */
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
  date: string
  location?: string
  notes?: string
}

export interface ExamReport {
  id: string
  name: string
  date: string
  result: string
  fileName?: string
}

export type ConditionStatus = 'ativa' | 'controlada' | 'resolvida'

export interface ClinicalCondition {
  id: string
  name: string
  /** Código CID-10, ex.: "I10" */
  cid?: string
  diagnosedAt: string
  status: ConditionStatus
}

export interface AppointmentSummary {
  appointmentId: string
  date: string
  doctorName: string
  specialty?: string
  summary: string
}

export interface Patient {
  /** Apenas dígitos (11 caracteres) */
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

export type CreatePatientInput = Pick<
  Patient,
  'cpf' | 'fullName' | 'birthDate' | 'sex' | 'bloodType' | 'phone' | 'email' | 'region'
>

/* ---------- Atendimento ---------- */

export type AppointmentStatus = 'realizado' | 'agendado'

export type DocumentType = 'receita' | 'laudo' | 'exame' | 'outro'

export interface AttachedDocument {
  id: string
  fileName: string
  type: DocumentType
  /** Data/hora ISO do upload */
  uploadedAt: string
}

export interface Appointment {
  id: string
  patientCpf: string
  patientName: string
  doctorId: string
  doctorName: string
  /** Data/hora ISO */
  date: string
  status: AppointmentStatus
  reason?: string
  summary: string
  documents: AttachedDocument[]
}

/** Dados enviados ao registrar um atendimento (inclui atualizações do prontuário) */
export interface CreateAppointmentInput {
  /** Se informado, conclui um atendimento agendado em vez de criar um novo */
  scheduledAppointmentId?: string
  patientCpf: string
  doctorId: string
  date: string
  status: AppointmentStatus
  reason?: string
  summary: string
  newAllergies: Omit<Allergy, 'id'>[]
  newMedications: Omit<Medication, 'id'>[]
  newConditions: Omit<ClinicalCondition, 'id'>[]
}

/** Arquivo a ser anexado ao atendimento (receita, laudo etc.) */
export interface DocumentUpload {
  file: File
  type: DocumentType
}

/* ---------- Dados regionais (gestor) ---------- */

export interface ConditionCount {
  name: string
  count: number
}

/** Agregado mensal de uma região */
export interface RegionalRecord {
  region: string
  /** Mês no formato AAAA-MM */
  month: string
  appointments: number
  uniquePatients: number
  conditions: ConditionCount[]
}

export interface RegionalFilters {
  /** Vazio = todas as regiões */
  region?: string
  /** AAAA-MM (inclusive) */
  from?: string
  /** AAAA-MM (inclusive) */
  to?: string
}
