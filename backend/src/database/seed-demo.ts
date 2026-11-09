// Dados extras de demonstração: mais médicos, pacientes e atendimentos para o site e o app
// terem bastante coisa na tela. Tudo inventado. Ficam separados de seed-data.ts porque os
// testes contam os dados de lá (ex.: a agenda do Dr. Rafael); estes usam outros médicos.
//
// CPFs gerados aleatoriamente, com dígitos verificadores válidos e sem sequências ou CPFs
// de exemplo. Podem coincidir com o de alguém: servem só para desenvolvimento e demonstração.

import type { Patient } from '../patients/patient.schema.js'
import type { SeedAppointment, SeedUser } from './seed-data.js'

export const DEMO_CPFS = {
  lucia: '06138348362',
  roberto: '52525738080',
  helena: '18987248577',
  gabriel: '68009520365',
  sofia: '89313074893',
  antonio: '78730915384',
  juliana: '24264235952',
  marcos: '58573074060',
  isabela: '22678790509',
  francisco: '91085148289',
  camilaPaciente: '55991928819',
  eduardo: '93915754714',
} as const

export type DemoPatientKey = keyof typeof DEMO_CPFS

const PEDIATRA = 'pediatra@teste.com'
const GINECO = 'gineco@teste.com'
const ORTO = 'orto@teste.com'

export const demoUsers: SeedUser[] = [
  {
    name: 'Dr. Thiago Alves Mendonça',
    email: PEDIATRA,
    role: 'medico',
    crm: 'CRM-SP 345678',
    specialty: 'Pediatria',
    phone: '(13) 3221-4455',
    institution: 'Policlínica de Santos',
  },
  {
    name: 'Dra. Fernanda Lopes Carvalho',
    email: GINECO,
    role: 'medico',
    crm: 'CRM-SP 456789',
    specialty: 'Ginecologia e Obstetrícia',
    phone: '(12) 3941-7788',
    institution: 'Hospital Municipal de São José dos Campos',
  },
  {
    name: 'Dr. Lucas Ribeiro Tavares',
    email: ORTO,
    role: 'medico',
    crm: 'CRM-SP 567890',
    specialty: 'Ortopedia',
    phone: '(16) 3602-5544',
    institution: 'Hospital Estadual de Ribeirão Preto',
  },
  {
    name: 'Ricardo Menezes Prado',
    email: 'gestor2@teste.com',
    role: 'gestor',
    phone: '(16) 3977-1200',
    institution: 'Departamento Regional de Saúde de Ribeirão Preto',
  },
]

export const demoPatients: Patient[] = [
  {
    cpf: DEMO_CPFS.lucia,
    fullName: 'Lúcia Helena Martins',
    birthDate: '1949-02-08',
    sex: 'F',
    bloodType: 'A+',
    phone: '(16) 99712-3344',
    region: 'Ribeirão Preto',
    allergies: [{ substance: 'Sulfa', severity: 'moderada', reaction: 'Erupção na pele', recordedAt: '2009-05-14' }],
    activeMedications: [
      { name: 'Alendronato de sódio', dosage: '70 mg', frequency: '1x por semana (em jejum)', startDate: '2022-03-01', prescribedBy: 'Dr. Lucas Ribeiro Tavares' },
      { name: 'Carbonato de cálcio + vitamina D', dosage: '600 mg + 400 UI', frequency: '1x ao dia', startDate: '2022-03-01' },
      { name: 'Anlodipino', dosage: '5 mg', frequency: '1x ao dia', startDate: '2017-08-20' },
    ],
    procedures: [{ name: 'Artroplastia total de quadril (esquerdo)', date: '2023-10-05', location: 'Hospital Estadual de Ribeirão Preto', notes: 'Fisioterapia concluída' }],
    exams: [
      { name: 'Densitometria óssea', date: '2026-05-12', result: 'Osteoporose em colo de fêmur (T-score -2,7)' },
      { name: 'Raio-X de quadril', date: '2026-05-12', result: 'Prótese bem posicionada' },
    ],
    clinicalConditions: [
      { name: 'Osteoporose', cid: 'M81', diagnosedAt: '2022-03-01', status: 'ativa' },
      { name: 'Hipertensão arterial sistêmica', cid: 'I10', diagnosedAt: '2017-08-20', status: 'controlada' },
    ],
  },
  {
    cpf: DEMO_CPFS.roberto,
    fullName: 'Roberto Carlos Nunes',
    birthDate: '1979-09-30',
    sex: 'M',
    bloodType: 'O+',
    phone: '(16) 98120-4567',
    email: 'roberto.nunes@email.com',
    region: 'Ribeirão Preto',
    allergies: [],
    activeMedications: [{ name: 'Ibuprofeno', dosage: '600 mg', frequency: '8 em 8 horas por 5 dias', startDate: '2026-10-20', prescribedBy: 'Dr. Lucas Ribeiro Tavares' }],
    procedures: [{ name: 'Reconstrução do ligamento cruzado anterior (joelho direito)', date: '2019-04-17', location: 'Hospital São Francisco - Ribeirão Preto' }],
    exams: [{ name: 'Ressonância magnética de coluna lombar', date: '2026-10-18', result: 'Protrusão discal L4-L5 sem compressão radicular' }],
    clinicalConditions: [{ name: 'Lombalgia', cid: 'M54.5', diagnosedAt: '2026-10-20', status: 'ativa' }],
  },
  {
    cpf: DEMO_CPFS.helena,
    fullName: 'Helena Vieira Campos',
    birthDate: '2019-06-11',
    sex: 'F',
    bloodType: 'B-',
    phone: '(13) 99654-1122',
    region: 'Baixada Santista',
    allergies: [{ substance: 'Amendoim', severity: 'grave', reaction: 'Edema de glote', recordedAt: '2022-01-09' }],
    activeMedications: [{ name: 'Adrenalina autoinjetável', dosage: '0,15 mg', frequency: 'Em caso de reação grave', startDate: '2022-01-09', prescribedBy: 'Dr. Thiago Alves Mendonça' }],
    procedures: [],
    exams: [{ name: 'IgE específica para amendoim', date: '2025-11-03', result: 'Classe 4 (alta)' }],
    clinicalConditions: [{ name: 'Alergia alimentar a amendoim', cid: 'T78.1', diagnosedAt: '2022-01-09', status: 'ativa' }],
  },
  {
    cpf: DEMO_CPFS.gabriel,
    fullName: 'Gabriel Henrique Souza',
    birthDate: '2016-12-02',
    sex: 'M',
    bloodType: 'A+',
    phone: '(13) 99788-3300',
    region: 'Baixada Santista',
    allergies: [],
    activeMedications: [{ name: 'Montelucaste', dosage: '5 mg', frequency: '1x à noite', startDate: '2025-04-15', prescribedBy: 'Dr. Thiago Alves Mendonça' }],
    procedures: [{ name: 'Adenoidectomia', date: '2021-07-22', location: 'Hospital Guilherme Álvaro - Santos' }],
    exams: [{ name: 'Raio-X de tórax', date: '2026-09-02', result: 'Sem alterações' }],
    clinicalConditions: [
      { name: 'Asma', cid: 'J45', diagnosedAt: '2025-04-15', status: 'controlada' },
      { name: 'Otite média aguda', cid: 'H66', diagnosedAt: '2026-09-02', status: 'resolvida' },
    ],
  },
  {
    cpf: DEMO_CPFS.sofia,
    fullName: 'Sofia Ramos Teixeira',
    birthDate: '1994-04-25',
    sex: 'F',
    bloodType: 'O-',
    phone: '(12) 98222-7711',
    email: 'sofia.teixeira@email.com',
    region: 'Vale do Paraíba',
    allergies: [],
    activeMedications: [
      { name: 'Ácido fólico', dosage: '5 mg', frequency: '1x ao dia', startDate: '2026-06-02', prescribedBy: 'Dra. Fernanda Lopes Carvalho' },
      { name: 'Sulfato ferroso', dosage: '40 mg', frequency: '1x ao dia', startDate: '2026-08-10', prescribedBy: 'Dra. Fernanda Lopes Carvalho' },
    ],
    procedures: [],
    exams: [
      { name: 'Ultrassonografia obstétrica', date: '2026-10-14', result: 'Gestação de 22 semanas, feto único, crescimento adequado' },
      { name: 'Hemograma completo', date: '2026-08-08', result: 'Hemoglobina 10,8 g/dL (anemia leve)' },
    ],
    clinicalConditions: [
      { name: 'Gestação de baixo risco', cid: 'Z34', diagnosedAt: '2026-05-28', status: 'ativa' },
      { name: 'Anemia na gestação', cid: 'O99.0', diagnosedAt: '2026-08-10', status: 'ativa' },
    ],
  },
  {
    cpf: DEMO_CPFS.antonio,
    fullName: 'Antônio José Ribeiro',
    birthDate: '1955-11-19',
    sex: 'M',
    bloodType: 'AB-',
    phone: '(15) 99130-2288',
    region: 'Sorocaba',
    allergies: [{ substance: 'Ácido acetilsalicílico (AAS)', severity: 'moderada', reaction: 'Broncoespasmo', recordedAt: '2014-03-03' }],
    activeMedications: [
      { name: 'Insulina NPH', dosage: '20 UI manhã / 10 UI noite', frequency: '2x ao dia', startDate: '2021-06-01' },
      { name: 'Enalapril', dosage: '10 mg', frequency: '2x ao dia', startDate: '2016-02-10' },
    ],
    procedures: [{ name: 'Amputação do 2º pododáctilo (pé direito)', date: '2024-02-14', location: 'Conjunto Hospitalar de Sorocaba' }],
    exams: [
      { name: 'Hemoglobina glicada (HbA1c)', date: '2026-09-21', result: '8,4% — acima da meta' },
      { name: 'Creatinina', date: '2026-09-21', result: '1,4 mg/dL' },
    ],
    clinicalConditions: [
      { name: 'Diabetes mellitus tipo 2', cid: 'E11', diagnosedAt: '2008-05-12', status: 'ativa' },
      { name: 'Doença renal crônica estágio 3', cid: 'N18.3', diagnosedAt: '2025-01-20', status: 'ativa' },
    ],
  },
  {
    cpf: DEMO_CPFS.juliana,
    fullName: 'Juliana Moreira Lopes',
    birthDate: '1988-08-03',
    sex: 'F',
    bloodType: 'A-',
    phone: '(12) 99345-6677',
    email: 'juliana.lopes@email.com',
    region: 'Vale do Paraíba',
    allergies: [{ substance: 'Látex', severity: 'leve', reaction: 'Coceira local', recordedAt: '2018-09-25' }],
    activeMedications: [{ name: 'Levotiroxina', dosage: '75 mcg', frequency: '1x ao dia (em jejum)', startDate: '2020-11-05' }],
    procedures: [{ name: 'Cesariana', date: '2018-09-25', location: 'Hospital Municipal de São José dos Campos' }],
    exams: [
      { name: 'TSH', date: '2026-07-30', result: '2,1 mUI/L (normal)' },
      { name: 'Papanicolau', date: '2026-07-30', result: 'Negativo para lesão intraepitelial' },
    ],
    clinicalConditions: [{ name: 'Hipotireoidismo', cid: 'E03.9', diagnosedAt: '2020-11-05', status: 'controlada' }],
  },
  {
    cpf: DEMO_CPFS.marcos,
    fullName: 'Marcos Vinícius Andrade',
    birthDate: '2001-01-14',
    sex: 'M',
    bloodType: 'B+',
    phone: '(11) 97433-8800',
    region: 'Grande São Paulo',
    allergies: [],
    activeMedications: [],
    procedures: [{ name: 'Redução fechada de fratura de rádio distal', date: '2026-09-28', location: 'Pronto-Socorro Central - SP', notes: 'Imobilização gessada por 6 semanas' }],
    exams: [{ name: 'Raio-X de punho', date: '2026-09-28', result: 'Fratura de rádio distal sem desvio' }],
    clinicalConditions: [{ name: 'Fratura de rádio distal', cid: 'S52.5', diagnosedAt: '2026-09-28', status: 'ativa' }],
  },
  {
    cpf: DEMO_CPFS.isabela,
    fullName: 'Isabela Cristina Barros',
    birthDate: '2011-03-29',
    sex: 'F',
    bloodType: 'O+',
    phone: '(19) 99812-0044',
    region: 'Campinas',
    allergies: [{ substance: 'Ácaros', severity: 'leve', reaction: 'Rinite', recordedAt: '2017-05-02' }],
    activeMedications: [{ name: 'Loratadina', dosage: '10 mg', frequency: '1x ao dia nas crises', startDate: '2017-05-02' }],
    procedures: [],
    exams: [{ name: 'Hemograma completo', date: '2026-03-11', result: 'Eosinofilia leve' }],
    clinicalConditions: [{ name: 'Rinite alérgica', cid: 'J30', diagnosedAt: '2017-05-02', status: 'controlada' }],
  },
  {
    cpf: DEMO_CPFS.francisco,
    fullName: 'Francisco das Chagas Lima',
    birthDate: '1962-07-07',
    sex: 'M',
    bloodType: 'Não informado',
    phone: '(15) 99601-7733',
    region: 'Sorocaba',
    allergies: [],
    activeMedications: [{ name: 'Tansulosina', dosage: '0,4 mg', frequency: '1x à noite', startDate: '2025-06-18' }],
    procedures: [],
    exams: [{ name: 'PSA total', date: '2026-06-10', result: '3,2 ng/mL (normal para a idade)' }],
    clinicalConditions: [{ name: 'Hiperplasia prostática benigna', cid: 'N40', diagnosedAt: '2025-06-18', status: 'controlada' }],
  },
  {
    cpf: DEMO_CPFS.camilaPaciente,
    fullName: 'Camila Duarte Freitas',
    birthDate: '1999-12-21',
    sex: 'F',
    bloodType: 'AB+',
    phone: '(11) 98877-6655',
    email: 'camila.freitas@email.com',
    region: 'Grande São Paulo',
    allergies: [{ substance: 'Cefalexina', severity: 'grave', reaction: 'Angioedema', recordedAt: '2023-02-17' }],
    activeMedications: [{ name: 'Anticoncepcional oral combinado', dosage: '0,03 mg + 0,15 mg', frequency: '1x ao dia', startDate: '2024-01-08', prescribedBy: 'Dra. Fernanda Lopes Carvalho' }],
    procedures: [],
    exams: [{ name: 'Ultrassonografia transvaginal', date: '2026-04-22', result: 'Útero e ovários sem alterações' }],
    clinicalConditions: [],
  },
  {
    cpf: DEMO_CPFS.eduardo,
    fullName: 'Eduardo Pires Monteiro',
    birthDate: '1970-05-16',
    sex: 'M',
    bloodType: 'A+',
    phone: '(16) 99145-9090',
    region: 'Ribeirão Preto',
    allergies: [{ substance: 'Contraste iodado', severity: 'moderada', reaction: 'Urticária generalizada', recordedAt: '2020-10-01' }],
    activeMedications: [{ name: 'Diclofenaco gel', dosage: '1%', frequency: '3x ao dia no ombro', startDate: '2026-10-02', prescribedBy: 'Dr. Lucas Ribeiro Tavares' }],
    procedures: [],
    exams: [{ name: 'Ultrassonografia de ombro direito', date: '2026-09-29', result: 'Tendinopatia do supraespinhal sem ruptura' }],
    clinicalConditions: [{ name: 'Tendinite do manguito rotador', cid: 'M75.1', diagnosedAt: '2026-10-02', status: 'ativa' }],
  },
]

/** Pacientes extras com conta no app (senha paciente123). Os demais servem para testar o primeiro acesso. */
export const demoPatientAccounts: DemoPatientKey[] = ['sofia', 'roberto', 'camilaPaciente']

export type DemoAppointment = Omit<SeedAppointment, 'patient'> & { patient: DemoPatientKey }

export const demoAppointments: DemoAppointment[] = [
  // ---------- Dr. Thiago (Pediatria) ----------
  { patient: 'helena', doctorEmail: PEDIATRA, daysFromNow: 2, hour: 9, status: 'agendado', reason: 'Revisão do plano de alergia', summary: '', instructions: 'Trazer a caneta de adrenalina para conferir a validade.' },
  { patient: 'gabriel', doctorEmail: PEDIATRA, daysFromNow: 5, hour: 10, minute: 30, status: 'agendado', reason: 'Retorno — asma', summary: '', instructions: 'Trazer a bombinha e o espaçador para revisar a técnica.' },
  { patient: 'isabela', doctorEmail: PEDIATRA, daysFromNow: 9, hour: 14, status: 'agendado', reason: 'Consulta de rotina (adolescente)', summary: '', instructions: 'Trazer a carteira de vacinação.' },
  {
    patient: 'helena', doctorEmail: PEDIATRA, daysFromNow: -370, hour: 9, status: 'realizado',
    reason: 'Reação ao comer amendoim',
    summary: 'Edema de lábios após ingestão de paçoca. Orientada exclusão total de amendoim. Prescrita adrenalina autoinjetável.',
    documents: [{ fileName: 'plano_alergia_helena.pdf', type: 'laudo', minutesAfter: 30 }],
  },
  {
    patient: 'gabriel', doctorEmail: PEDIATRA, daysFromNow: -68, hour: 11, status: 'realizado',
    reason: 'Dor de ouvido e febre',
    summary: 'Otite média aguda à direita. Amoxicilina por 10 dias. Asma estável, mantido montelucaste.',
    documents: [{ fileName: 'receita_amoxicilina_gabriel.pdf', type: 'receita', minutesAfter: 20 }],
  },
  {
    patient: 'gabriel', doctorEmail: PEDIATRA, daysFromNow: -205, hour: 15, status: 'realizado',
    reason: 'Crises de chiado à noite',
    summary: 'Asma persistente leve. Iniciado montelucaste e plano de ação por escrito para os pais.',
  },
  {
    patient: 'isabela', doctorEmail: PEDIATRA, daysFromNow: -242, hour: 8, minute: 30, status: 'realizado',
    reason: 'Espirros e nariz entupido',
    summary: 'Rinite alérgica em crise. Loratadina nas crises e orientações de controle ambiental (ácaros).',
  },

  // ---------- Dra. Fernanda (Ginecologia e Obstetrícia) ----------
  { patient: 'sofia', doctorEmail: GINECO, daysFromNow: 1, hour: 8, status: 'agendado', reason: 'Pré-natal — 26 semanas', summary: '', instructions: 'Fazer a curva glicêmica (TOTG) antes da consulta. Jejum de 8 horas no dia do exame.' },
  { patient: 'juliana', doctorEmail: GINECO, daysFromNow: 4, hour: 15, status: 'agendado', reason: 'Consulta ginecológica anual', summary: '', instructions: 'Evitar relação sexual e cremes vaginais 48 horas antes (coleta do preventivo).' },
  { patient: 'camilaPaciente', doctorEmail: GINECO, daysFromNow: 12, hour: 10, status: 'agendado', reason: 'Renovação do anticoncepcional', summary: '' },
  {
    patient: 'sofia', doctorEmail: GINECO, daysFromNow: -26, hour: 9, status: 'realizado',
    reason: 'Pré-natal — 22 semanas',
    summary: 'Gestação evoluindo bem. PA 110/70. Ultrassom morfológico sem alterações. Mantidos ácido fólico e sulfato ferroso.',
    documents: [
      { fileName: 'ultrassom_morfologico_sofia.pdf', type: 'exame', minutesAfter: 15 },
      { fileName: 'receita_sulfato_ferroso_sofia.pdf', type: 'receita', minutesAfter: 25 },
    ],
  },
  {
    patient: 'sofia', doctorEmail: GINECO, daysFromNow: -90, hour: 9, status: 'realizado',
    reason: 'Primeira consulta de pré-natal',
    summary: 'Gestação confirmada, 13 semanas. Solicitados exames do primeiro trimestre. Iniciado ácido fólico.',
    documents: [{ fileName: 'pedido_exames_pre_natal.pdf', type: 'outro', minutesAfter: 30 }],
  },
  {
    patient: 'juliana', doctorEmail: GINECO, daysFromNow: -102, hour: 14, status: 'realizado',
    reason: 'Rotina ginecológica',
    summary: 'Exame clínico normal. Coletado preventivo. TSH em dia, hipotireoidismo controlado.',
    documents: [{ fileName: 'resultado_papanicolau_juliana.pdf', type: 'exame', minutesAfter: 40 }],
  },
  {
    patient: 'camilaPaciente', doctorEmail: GINECO, daysFromNow: -200, hour: 16, status: 'realizado',
    reason: 'Orientação contraceptiva',
    summary: 'Sem contraindicações. Iniciado anticoncepcional oral combinado. Reforçada alergia grave a cefalexina.',
    documents: [{ fileName: 'receita_anticoncepcional.pdf', type: 'receita', minutesAfter: 20 }],
  },

  // ---------- Dr. Lucas (Ortopedia) ----------
  { patient: 'lucia', doctorEmail: ORTO, daysFromNow: 3, hour: 8, status: 'agendado', reason: 'Acompanhamento de osteoporose', summary: '', instructions: 'Trazer a densitometria e a lista de remédios em uso.' },
  { patient: 'marcos', doctorEmail: ORTO, daysFromNow: 6, hour: 11, status: 'agendado', reason: 'Retirada do gesso', summary: '', instructions: 'Fazer o raio-X de controle do punho no mesmo dia, antes da consulta.' },
  { patient: 'roberto', doctorEmail: ORTO, daysFromNow: 10, hour: 16, status: 'agendado', reason: 'Retorno — lombalgia', summary: '' },
  { patient: 'eduardo', doctorEmail: ORTO, daysFromNow: 15, hour: 9, status: 'agendado', reason: 'Reavaliação do ombro', summary: '', instructions: 'Vir com roupa que deixe o ombro livre.' },
  {
    patient: 'lucia', doctorEmail: ORTO, daysFromNow: -181, hour: 10, status: 'realizado',
    reason: 'Dor no quadril',
    summary: 'Prótese de quadril bem posicionada. Densitometria com osteoporose. Mantido alendronato, cálcio e vitamina D.',
    documents: [{ fileName: 'laudo_densitometria_lucia.pdf', type: 'laudo', minutesAfter: 30 }],
  },
  {
    patient: 'roberto', doctorEmail: ORTO, daysFromNow: -20, hour: 17, status: 'realizado',
    reason: 'Dor lombar há 2 semanas',
    summary: 'Lombalgia mecânica sem sinais de alarme. Ressonância com protrusão L4-L5. Anti-inflamatório por 5 dias e fisioterapia.',
    documents: [
      { fileName: 'receita_ibuprofeno_roberto.pdf', type: 'receita', minutesAfter: 15 },
      { fileName: 'laudo_ressonancia_lombar.pdf', type: 'laudo', minutesAfter: 20 },
    ],
  },
  {
    patient: 'marcos', doctorEmail: ORTO, daysFromNow: -42, hour: 13, status: 'realizado',
    reason: 'Queda de bicicleta',
    summary: 'Fratura de rádio distal sem desvio. Redução e imobilização gessada por 6 semanas. Analgésico se dor.',
    documents: [{ fileName: 'raio_x_punho_marcos.pdf', type: 'exame', minutesAfter: 10 }],
  },
  {
    patient: 'eduardo', doctorEmail: ORTO, daysFromNow: -38, hour: 15, status: 'realizado',
    reason: 'Dor no ombro direito ao levantar o braço',
    summary: 'Tendinite do supraespinhal confirmada no ultrassom. Diclofenaco gel e fisioterapia. Alergia a contraste anotada.',
  },
  {
    patient: 'antonio', doctorEmail: ORTO, daysFromNow: -270, hour: 9, status: 'realizado',
    reason: 'Acompanhamento pós-amputação',
    summary: 'Cicatrização completa. Orientada palmilha e calçado adequado. Encaminhado ao endocrinologista pelo controle glicêmico.',
  },
  {
    patient: 'francisco', doctorEmail: ORTO, daysFromNow: -150, hour: 11, status: 'realizado',
    reason: 'Dor no joelho esquerdo',
    summary: 'Artrose leve de joelho. Orientados exercícios e perda de peso. Sem indicação cirúrgica.',
  },
]
