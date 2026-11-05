import type { Appointment, Patient } from '../types'
import { mockAppointments } from './appointments'
import { mockPatients } from './patients'

// "Banco de dados" em memória usado pelo modo mock.
// As alterações também são copiadas para o sessionStorage, então sobrevivem
// a um F5, mas somem ao fechar a aba (comportamento de sessão).

interface MockDb {
  patients: Patient[]
  appointments: Appointment[]
}

const STORAGE_KEY = 'saude-unificada:mock-db:v1'

function initialDb(): MockDb {
  return structuredClone({ patients: mockPatients, appointments: mockAppointments })
}

function loadDb(): MockDb {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as MockDb
  } catch {
    // sessionStorage indisponível (ex.: modo privado): segue só em memória
  }
  return initialDb()
}

export const db: MockDb = loadDb()

export function persistDb(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // ignora: os dados continuam em memória
  }
}

/** Restaura os dados originais dos mocks */
export function resetDb(): void {
  const fresh = initialDb()
  db.patients = fresh.patients
  db.appointments = fresh.appointments
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignora
  }
}
