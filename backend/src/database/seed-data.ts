// Dados iniciais do banco, copiados dos mocks do front (frontend/src/mocks/).
// Os ids fixos dos mocks (u-medico-1, al-1...) não vêm junto: o MongoDB gera os próprios.

import type { UserRole } from '../common/roles.js'

/** Senha de todos os usuários de teste (gravada com hash bcrypt pelo seed) */
export const SEED_PASSWORD = '123456'

export interface SeedUser {
  name: string
  email: string
  role: UserRole
  crm?: string
  specialty?: string
  phone?: string
  institution?: string
}

export const seedUsers: SeedUser[] = [
  {
    name: 'Dr. Rafael Moreira Lima',
    email: 'medico@teste.com',
    role: 'medico',
    crm: 'CRM-SP 123456',
    specialty: 'Clínica Médica',
    phone: '(11) 3456-7890',
    institution: 'UBS Vila Mariana',
  },
  {
    name: 'Dra. Camila Nogueira Reis',
    email: 'cardio@teste.com',
    role: 'medico',
    crm: 'CRM-SP 234567',
    specialty: 'Cardiologia',
    phone: '(19) 3222-1100',
    institution: 'Hospital Regional de Campinas',
  },
  {
    name: 'Juliana Prado Santos',
    email: 'gestor@teste.com',
    role: 'gestor',
    phone: '(11) 3333-4444',
    institution: 'Secretaria Estadual de Saúde de SP',
  },
]
