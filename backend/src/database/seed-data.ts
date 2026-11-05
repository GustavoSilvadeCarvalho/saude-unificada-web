// Dados iniciais do banco, copiados dos mocks do front (frontend/src/mocks/).
// Os ids fixos dos mocks (u-medico-1, al-1...) não vêm junto: o MongoDB gera os próprios.

import type { UserRole } from '../common/roles.js'
import type { Patient } from '../patients/patient.schema.js'

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

/* ---------- Pacientes (frontend/src/mocks/patients.ts) ---------- */

// CPFs fictícios gerados aleatoriamente (dígitos verificadores válidos, sem sequências
// nem CPFs de exemplo). Qualquer CPF válido pode coincidir com o de alguém, por isso
// estes dados existem só para desenvolvimento, testes e demonstração.
export const SEED_CPFS = {
  maria: '22916926402',
  joao: '27952204408',
  ana: '50717927296',
  carlos: '86174860825',
  beatriz: '97077695999',
  pedro: '23130980369',
}

export const seedPatients: Patient[] = [
  {
    cpf: SEED_CPFS.maria,
    fullName: 'Maria Aparecida da Silva',
    birthDate: '1958-03-14',
    sex: 'F',
    bloodType: 'O-',
    phone: '(11) 98765-4321',
    email: 'maria.silva@email.com',
    region: 'Grande São Paulo',
    allergies: [
      { substance: 'Penicilina', severity: 'grave', reaction: 'Anafilaxia', recordedAt: '2015-06-02' },
      { substance: 'Dipirona', severity: 'moderada', reaction: 'Urticária', recordedAt: '2019-11-20' },
    ],
    activeMedications: [
      { name: 'Losartana potássica', dosage: '50 mg', frequency: '1x ao dia', startDate: '2018-04-10', prescribedBy: 'Dr. Rafael Moreira Lima' },
      { name: 'Metformina', dosage: '850 mg', frequency: '2x ao dia (após refeições)', startDate: '2020-02-15', prescribedBy: 'Dr. Rafael Moreira Lima' },
      { name: 'Sinvastatina', dosage: '20 mg', frequency: '1x à noite', startDate: '2021-08-03' },
    ],
    procedures: [
      { name: 'Colecistectomia videolaparoscópica', date: '2016-09-12', location: 'Hospital das Clínicas - SP', notes: 'Sem intercorrências' },
      { name: 'Cirurgia de catarata (olho direito)', date: '2023-05-30', location: 'Hospital Oftalmológico de SP' },
    ],
    exams: [
      { name: 'Hemoglobina glicada (HbA1c)', date: '2026-07-18', result: '7,1% — acima da meta', fileName: 'hba1c_jul2026.pdf' },
      { name: 'Perfil lipídico', date: '2026-07-18', result: 'LDL 98 mg/dL; HDL 52 mg/dL', fileName: 'lipidico_jul2026.pdf' },
      { name: 'Eletrocardiograma', date: '2026-02-04', result: 'Ritmo sinusal, sem alterações agudas' },
    ],
    clinicalConditions: [
      { name: 'Hipertensão arterial sistêmica', cid: 'I10', diagnosedAt: '2018-04-10', status: 'controlada' },
      { name: 'Diabetes mellitus tipo 2', cid: 'E11', diagnosedAt: '2020-02-15', status: 'ativa' },
      { name: 'Dislipidemia', cid: 'E78', diagnosedAt: '2021-08-03', status: 'controlada' },
    ],
  },
  {
    cpf: SEED_CPFS.joao,
    fullName: 'João Pedro Oliveira Santos',
    birthDate: '1985-07-22',
    sex: 'M',
    bloodType: 'A+',
    phone: '(19) 99876-5432',
    email: 'joao.santos@email.com',
    region: 'Campinas',
    allergies: [
      { substance: 'Frutos do mar', severity: 'moderada', reaction: 'Edema labial', recordedAt: '2010-01-15' },
    ],
    activeMedications: [
      { name: 'Salbutamol spray', dosage: '100 mcg', frequency: 'Se necessário (crise)', startDate: '2012-03-01' },
      { name: 'Budesonida + formoterol', dosage: '200/6 mcg', frequency: '2x ao dia', startDate: '2024-01-10' },
    ],
    procedures: [
      { name: 'Apendicectomia', date: '2004-11-03', location: 'Hospital PUC-Campinas' },
    ],
    exams: [
      { name: 'Espirometria', date: '2025-12-02', result: 'Distúrbio ventilatório obstrutivo leve com resposta ao broncodilatador' },
      { name: 'Hemograma completo', date: '2026-06-11', result: 'Dentro dos valores de referência' },
    ],
    clinicalConditions: [
      { name: 'Asma', cid: 'J45', diagnosedAt: '2012-03-01', status: 'controlada' },
      { name: 'Rinite alérgica', cid: 'J30', diagnosedAt: '2012-03-01', status: 'ativa' },
    ],
  },
  {
    cpf: SEED_CPFS.ana,
    fullName: 'Ana Luiza Ferreira Costa',
    birthDate: '1996-11-05',
    sex: 'F',
    bloodType: 'B+',
    phone: '(13) 99123-4567',
    region: 'Baixada Santista',
    allergies: [],
    activeMedications: [
      { name: 'Sulfato ferroso', dosage: '40 mg Fe', frequency: '1x ao dia', startDate: '2026-08-20', prescribedBy: 'Dr. Rafael Moreira Lima' },
    ],
    procedures: [],
    exams: [
      { name: 'Hemograma completo', date: '2026-08-15', result: 'Hb 10,8 g/dL — anemia leve', fileName: 'hemograma_ago2026.pdf' },
      { name: 'Ferritina', date: '2026-08-15', result: '9 ng/mL — baixa' },
    ],
    clinicalConditions: [
      { name: 'Anemia ferropriva', cid: 'D50', diagnosedAt: '2026-08-20', status: 'ativa' },
    ],
  },
  {
    cpf: SEED_CPFS.carlos,
    fullName: 'Carlos Eduardo Ribeiro',
    birthDate: '1949-01-30',
    sex: 'M',
    bloodType: 'AB+',
    phone: '(12) 98111-2233',
    region: 'Vale do Paraíba',
    allergies: [
      { substance: 'Ácido acetilsalicílico (AAS)', severity: 'grave', reaction: 'Broncoespasmo', recordedAt: '2008-05-14' },
      { substance: 'Iodo (contraste)', severity: 'moderada', reaction: 'Prurido e rash cutâneo', recordedAt: '2017-10-02' },
      { substance: 'Látex', severity: 'leve', reaction: 'Dermatite de contato', recordedAt: '2020-03-09' },
    ],
    activeMedications: [
      { name: 'Clopidogrel', dosage: '75 mg', frequency: '1x ao dia', startDate: '2022-09-18', prescribedBy: 'Dra. Camila Nogueira Reis' },
      { name: 'Atorvastatina', dosage: '40 mg', frequency: '1x à noite', startDate: '2022-09-18', prescribedBy: 'Dra. Camila Nogueira Reis' },
      { name: 'Metoprolol', dosage: '50 mg', frequency: '2x ao dia', startDate: '2022-09-18' },
      { name: 'Omeprazol', dosage: '20 mg', frequency: '1x em jejum', startDate: '2022-09-18' },
    ],
    procedures: [
      { name: 'Angioplastia coronariana com stent', date: '2022-09-15', location: 'Hospital Regional do Vale do Paraíba', notes: 'Stent farmacológico em artéria descendente anterior' },
    ],
    exams: [
      { name: 'Ecocardiograma', date: '2026-04-22', result: 'Fração de ejeção 52%, hipocinesia anterior discreta', fileName: 'eco_abr2026.pdf' },
      { name: 'Creatinina', date: '2026-04-22', result: '1,3 mg/dL' },
    ],
    clinicalConditions: [
      { name: 'Doença arterial coronariana', cid: 'I25', diagnosedAt: '2022-09-15', status: 'controlada' },
      { name: 'Hipertensão arterial sistêmica', cid: 'I10', diagnosedAt: '2005-02-11', status: 'controlada' },
      { name: 'Doença renal crônica estágio 2', cid: 'N18', diagnosedAt: '2024-06-01', status: 'ativa' },
    ],
  },
  {
    cpf: SEED_CPFS.beatriz,
    fullName: 'Beatriz Souza Almeida',
    birthDate: '2012-09-17',
    sex: 'F',
    bloodType: 'O+',
    phone: '(15) 99777-8899',
    region: 'Sorocaba',
    allergies: [
      { substance: 'Amendoim', severity: 'grave', reaction: 'Anafilaxia — porta caneta de adrenalina', recordedAt: '2016-02-10' },
    ],
    activeMedications: [],
    procedures: [
      { name: 'Adenoidectomia', date: '2018-07-05', location: 'Hospital Regional de Sorocaba' },
    ],
    exams: [
      { name: 'IgE específica para amendoim', date: '2025-10-08', result: 'Classe 4 — alta sensibilização' },
    ],
    clinicalConditions: [
      { name: 'Alergia alimentar', cid: 'T78.1', diagnosedAt: '2016-02-10', status: 'ativa' },
    ],
  },
  {
    cpf: SEED_CPFS.pedro,
    fullName: 'Pedro Henrique Martins',
    birthDate: '1978-04-03',
    sex: 'M',
    bloodType: 'A-',
    phone: '(16) 98222-3344',
    email: 'pedro.martins@email.com',
    region: 'Ribeirão Preto',
    allergies: [],
    activeMedications: [
      { name: 'Sertralina', dosage: '50 mg', frequency: '1x pela manhã', startDate: '2025-11-12' },
    ],
    procedures: [],
    exams: [
      { name: 'TSH', date: '2026-01-20', result: '2,1 mUI/L — normal' },
    ],
    clinicalConditions: [
      { name: 'Transtorno de ansiedade generalizada', cid: 'F41.1', diagnosedAt: '2025-11-12', status: 'ativa' },
      { name: 'Lombalgia crônica', cid: 'M54.5', diagnosedAt: '2023-03-08', status: 'controlada' },
    ],
  },
]
