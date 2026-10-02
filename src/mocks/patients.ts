import type { Patient } from '../types'
import { completeCpf } from '../utils/cpf'

// CPFs fictícios, mas válidos (dígitos verificadores calculados)
export const MOCK_CPFS = {
  maria: completeCpf('123456789'),
  joao: completeCpf('987654321'),
  ana: completeCpf('456123789'),
  carlos: completeCpf('321654987'),
  beatriz: completeCpf('741852963'),
  pedro: completeCpf('159357486'),
}

export const mockPatients: Patient[] = [
  {
    cpf: MOCK_CPFS.maria,
    fullName: 'Maria Aparecida da Silva',
    birthDate: '1958-03-14',
    sex: 'F',
    bloodType: 'O-',
    phone: '(11) 98765-4321',
    email: 'maria.silva@email.com',
    region: 'Grande São Paulo',
    allergies: [
      { id: 'al-1', substance: 'Penicilina', severity: 'grave', reaction: 'Anafilaxia', recordedAt: '2015-06-02' },
      { id: 'al-2', substance: 'Dipirona', severity: 'moderada', reaction: 'Urticária', recordedAt: '2019-11-20' },
    ],
    activeMedications: [
      { id: 'md-1', name: 'Losartana potássica', dosage: '50 mg', frequency: '1x ao dia', startDate: '2018-04-10', prescribedBy: 'Dr. Rafael Moreira Lima' },
      { id: 'md-2', name: 'Metformina', dosage: '850 mg', frequency: '2x ao dia (após refeições)', startDate: '2020-02-15', prescribedBy: 'Dr. Rafael Moreira Lima' },
      { id: 'md-3', name: 'Sinvastatina', dosage: '20 mg', frequency: '1x à noite', startDate: '2021-08-03' },
    ],
    procedures: [
      { id: 'pr-1', name: 'Colecistectomia videolaparoscópica', date: '2016-09-12', location: 'Hospital das Clínicas - SP', notes: 'Sem intercorrências' },
      { id: 'pr-2', name: 'Cirurgia de catarata (olho direito)', date: '2023-05-30', location: 'Hospital Oftalmológico de SP' },
    ],
    exams: [
      { id: 'ex-1', name: 'Hemoglobina glicada (HbA1c)', date: '2026-07-18', result: '7,1% — acima da meta', fileName: 'hba1c_jul2026.pdf' },
      { id: 'ex-2', name: 'Perfil lipídico', date: '2026-07-18', result: 'LDL 98 mg/dL; HDL 52 mg/dL', fileName: 'lipidico_jul2026.pdf' },
      { id: 'ex-3', name: 'Eletrocardiograma', date: '2026-02-04', result: 'Ritmo sinusal, sem alterações agudas' },
    ],
    clinicalConditions: [
      { id: 'cc-1', name: 'Hipertensão arterial sistêmica', cid: 'I10', diagnosedAt: '2018-04-10', status: 'controlada' },
      { id: 'cc-2', name: 'Diabetes mellitus tipo 2', cid: 'E11', diagnosedAt: '2020-02-15', status: 'ativa' },
      { id: 'cc-3', name: 'Dislipidemia', cid: 'E78', diagnosedAt: '2021-08-03', status: 'controlada' },
    ],
    appointmentSummaries: [],
  },
  {
    cpf: MOCK_CPFS.joao,
    fullName: 'João Pedro Oliveira Santos',
    birthDate: '1985-07-22',
    sex: 'M',
    bloodType: 'A+',
    phone: '(19) 99876-5432',
    email: 'joao.santos@email.com',
    region: 'Campinas',
    allergies: [
      { id: 'al-3', substance: 'Frutos do mar', severity: 'moderada', reaction: 'Edema labial', recordedAt: '2010-01-15' },
    ],
    activeMedications: [
      { id: 'md-4', name: 'Salbutamol spray', dosage: '100 mcg', frequency: 'Se necessário (crise)', startDate: '2012-03-01' },
      { id: 'md-5', name: 'Budesonida + formoterol', dosage: '200/6 mcg', frequency: '2x ao dia', startDate: '2024-01-10' },
    ],
    procedures: [
      { id: 'pr-3', name: 'Apendicectomia', date: '2004-11-03', location: 'Hospital PUC-Campinas' },
    ],
    exams: [
      { id: 'ex-4', name: 'Espirometria', date: '2025-12-02', result: 'Distúrbio ventilatório obstrutivo leve com resposta ao broncodilatador' },
      { id: 'ex-5', name: 'Hemograma completo', date: '2026-06-11', result: 'Dentro dos valores de referência' },
    ],
    clinicalConditions: [
      { id: 'cc-4', name: 'Asma', cid: 'J45', diagnosedAt: '2012-03-01', status: 'controlada' },
      { id: 'cc-5', name: 'Rinite alérgica', cid: 'J30', diagnosedAt: '2012-03-01', status: 'ativa' },
    ],
    appointmentSummaries: [],
  },
  {
    cpf: MOCK_CPFS.ana,
    fullName: 'Ana Luiza Ferreira Costa',
    birthDate: '1996-11-05',
    sex: 'F',
    bloodType: 'B+',
    phone: '(13) 99123-4567',
    region: 'Baixada Santista',
    allergies: [],
    activeMedications: [
      { id: 'md-6', name: 'Sulfato ferroso', dosage: '40 mg Fe', frequency: '1x ao dia', startDate: '2026-08-20', prescribedBy: 'Dr. Rafael Moreira Lima' },
    ],
    procedures: [],
    exams: [
      { id: 'ex-6', name: 'Hemograma completo', date: '2026-08-15', result: 'Hb 10,8 g/dL — anemia leve', fileName: 'hemograma_ago2026.pdf' },
      { id: 'ex-7', name: 'Ferritina', date: '2026-08-15', result: '9 ng/mL — baixa' },
    ],
    clinicalConditions: [
      { id: 'cc-6', name: 'Anemia ferropriva', cid: 'D50', diagnosedAt: '2026-08-20', status: 'ativa' },
    ],
    appointmentSummaries: [],
  },
  {
    cpf: MOCK_CPFS.carlos,
    fullName: 'Carlos Eduardo Ribeiro',
    birthDate: '1949-01-30',
    sex: 'M',
    bloodType: 'AB+',
    phone: '(12) 98111-2233',
    region: 'Vale do Paraíba',
    allergies: [
      { id: 'al-4', substance: 'Ácido acetilsalicílico (AAS)', severity: 'grave', reaction: 'Broncoespasmo', recordedAt: '2008-05-14' },
      { id: 'al-5', substance: 'Iodo (contraste)', severity: 'moderada', reaction: 'Prurido e rash cutâneo', recordedAt: '2017-10-02' },
      { id: 'al-6', substance: 'Látex', severity: 'leve', reaction: 'Dermatite de contato', recordedAt: '2020-03-09' },
    ],
    activeMedications: [
      { id: 'md-7', name: 'Clopidogrel', dosage: '75 mg', frequency: '1x ao dia', startDate: '2022-09-18', prescribedBy: 'Dra. Camila Nogueira Reis' },
      { id: 'md-8', name: 'Atorvastatina', dosage: '40 mg', frequency: '1x à noite', startDate: '2022-09-18', prescribedBy: 'Dra. Camila Nogueira Reis' },
      { id: 'md-9', name: 'Metoprolol', dosage: '50 mg', frequency: '2x ao dia', startDate: '2022-09-18' },
      { id: 'md-10', name: 'Omeprazol', dosage: '20 mg', frequency: '1x em jejum', startDate: '2022-09-18' },
    ],
    procedures: [
      { id: 'pr-4', name: 'Angioplastia coronariana com stent', date: '2022-09-15', location: 'Hospital Regional do Vale do Paraíba', notes: 'Stent farmacológico em artéria descendente anterior' },
    ],
    exams: [
      { id: 'ex-8', name: 'Ecocardiograma', date: '2026-04-22', result: 'Fração de ejeção 52%, hipocinesia anterior discreta', fileName: 'eco_abr2026.pdf' },
      { id: 'ex-9', name: 'Creatinina', date: '2026-04-22', result: '1,3 mg/dL' },
    ],
    clinicalConditions: [
      { id: 'cc-7', name: 'Doença arterial coronariana', cid: 'I25', diagnosedAt: '2022-09-15', status: 'controlada' },
      { id: 'cc-8', name: 'Hipertensão arterial sistêmica', cid: 'I10', diagnosedAt: '2005-02-11', status: 'controlada' },
      { id: 'cc-9', name: 'Doença renal crônica estágio 2', cid: 'N18', diagnosedAt: '2024-06-01', status: 'ativa' },
    ],
    appointmentSummaries: [],
  },
  {
    cpf: MOCK_CPFS.beatriz,
    fullName: 'Beatriz Souza Almeida',
    birthDate: '2012-09-17',
    sex: 'F',
    bloodType: 'O+',
    phone: '(15) 99777-8899',
    region: 'Sorocaba',
    allergies: [
      { id: 'al-7', substance: 'Amendoim', severity: 'grave', reaction: 'Anafilaxia — porta caneta de adrenalina', recordedAt: '2016-02-10' },
    ],
    activeMedications: [],
    procedures: [
      { id: 'pr-5', name: 'Adenoidectomia', date: '2018-07-05', location: 'Hospital Regional de Sorocaba' },
    ],
    exams: [
      { id: 'ex-10', name: 'IgE específica para amendoim', date: '2025-10-08', result: 'Classe 4 — alta sensibilização' },
    ],
    clinicalConditions: [
      { id: 'cc-10', name: 'Alergia alimentar', cid: 'T78.1', diagnosedAt: '2016-02-10', status: 'ativa' },
    ],
    appointmentSummaries: [],
  },
  {
    cpf: MOCK_CPFS.pedro,
    fullName: 'Pedro Henrique Martins',
    birthDate: '1978-04-03',
    sex: 'M',
    bloodType: 'A-',
    phone: '(16) 98222-3344',
    email: 'pedro.martins@email.com',
    region: 'Ribeirão Preto',
    allergies: [],
    activeMedications: [
      { id: 'md-11', name: 'Sertralina', dosage: '50 mg', frequency: '1x pela manhã', startDate: '2025-11-12' },
    ],
    procedures: [],
    exams: [
      { id: 'ex-11', name: 'TSH', date: '2026-01-20', result: '2,1 mUI/L — normal' },
    ],
    clinicalConditions: [
      { id: 'cc-11', name: 'Transtorno de ansiedade generalizada', cid: 'F41.1', diagnosedAt: '2025-11-12', status: 'ativa' },
      { id: 'cc-12', name: 'Lombalgia crônica', cid: 'M54.5', diagnosedAt: '2023-03-08', status: 'controlada' },
    ],
    appointmentSummaries: [],
  },
]
