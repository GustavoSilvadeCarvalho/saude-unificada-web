import type { User } from '../types'

// Usuários de teste. A senha só existe no mock; a API real nunca deve devolvê-la.
export interface MockUser extends User {
  password: string
}

export const mockUsers: MockUser[] = [
  {
    id: 'u-medico-1',
    name: 'Dr. Rafael Moreira Lima',
    email: 'medico@teste.com',
    password: '123456',
    role: 'medico',
    crm: 'CRM-SP 123456',
    specialty: 'Clínica Médica',
    phone: '(11) 3456-7890',
    institution: 'UBS Vila Mariana',
  },
  {
    id: 'u-medico-2',
    name: 'Dra. Camila Nogueira Reis',
    email: 'cardio@teste.com',
    password: '123456',
    role: 'medico',
    crm: 'CRM-SP 234567',
    specialty: 'Cardiologia',
    phone: '(19) 3222-1100',
    institution: 'Hospital Regional de Campinas',
  },
  {
    id: 'u-gestor-1',
    name: 'Juliana Prado Santos',
    email: 'gestor@teste.com',
    password: '123456',
    role: 'gestor',
    phone: '(11) 3333-4444',
    institution: 'Secretaria Estadual de Saúde de SP',
  },
]
