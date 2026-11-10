// Camada única de acesso a dados do app do paciente.
// Endpoints documentados em docs/API_CONTRACT.md (seção 5 — app mobile).
//
// A URL da API vem de EXPO_PUBLIC_API_URL (arquivo .env ou variável de ambiente).
// Em dev com emulador Android, "localhost" do host é 10.0.2.2.
// Em dispositivo físico na mesma rede Wi-Fi, use o IP do computador.

import type {
  AccessLogEntry,
  Appointment,
  AppointmentStatus,
  AuthResponse,
  DownloadUrlResponse,
  ExamReport,
  Patient,
  PatientRegisterInput,
} from '@/types'
import { onlyDigits } from '@/utils/cpf'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, '')

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

/* ---------- Helper de requisição ---------- */

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.')
  }

  if (!response.ok) {
    let message = `Erro ${response.status} ao acessar a API`
    try {
      const body = (await response.json()) as { message?: string }
      if (body?.message) message = body.message
    } catch {
      // corpo vazio ou não-JSON
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/* ---------- Autenticação (público) ---------- */

export async function patientLogin(cpf: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/patient-login', {
    method: 'POST',
    body: JSON.stringify({ cpf: onlyDigits(cpf), password }),
  })
}

export async function patientRegister(input: PatientRegisterInput): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/patient-register', {
    method: 'POST',
    body: JSON.stringify({
      cpf: onlyDigits(input.cpf),
      birthDate: input.birthDate,
      password: input.password,
    }),
  })
}

/* ---------- Rotas do paciente logado (somente leitura) ---------- */

/** Carteira Digital de Saúde */
export function getMyRecord(): Promise<Patient> {
  return request<Patient>('/me/record')
}

export function getMyAppointments(status: AppointmentStatus): Promise<Appointment[]> {
  return request<Appointment[]>(`/me/appointments?status=${status}`)
}

export function getMyExams(): Promise<ExamReport[]> {
  return request<ExamReport[]>('/me/exams')
}

/** Quem acessou meus dados (LGPD) */
export function getMyAccessLog(): Promise<AccessLogEntry[]> {
  return request<AccessLogEntry[]>('/me/access-log')
}

/**
 * Link temporário (5 min) para baixar receita/laudo. A URL não precisa de token:
 * é só abrir com `Linking.openURL(url)`.
 */
export function getDocumentDownloadUrl(
  appointmentId: string,
  documentId: string,
): Promise<DownloadUrlResponse> {
  return request<DownloadUrlResponse>(
    `/me/appointments/${appointmentId}/documents/${documentId}/download`,
  )
}
