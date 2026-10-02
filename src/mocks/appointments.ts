import type { Appointment } from '../types'
import { MOCK_CPFS } from './patients'

// Datas relativas a hoje, para sempre existirem atendimentos passados e futuros na demonstração
function daysFromNow(days: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const RAFAEL = { doctorId: 'u-medico-1', doctorName: 'Dr. Rafael Moreira Lima' }
const CAMILA = { doctorId: 'u-medico-2', doctorName: 'Dra. Camila Nogueira Reis' }

export const mockAppointments: Appointment[] = [
  // Próximos atendimentos
  { id: 'at-101', patientCpf: MOCK_CPFS.maria, patientName: 'Maria Aparecida da Silva', ...RAFAEL, date: daysFromNow(1, 9), status: 'agendado', reason: 'Retorno — controle glicêmico', summary: '', documents: [] },
  { id: 'at-102', patientCpf: MOCK_CPFS.ana, patientName: 'Ana Luiza Ferreira Costa', ...RAFAEL, date: daysFromNow(1, 10, 30), status: 'agendado', reason: 'Reavaliação de anemia', summary: '', documents: [] },
  { id: 'at-103', patientCpf: MOCK_CPFS.pedro, patientName: 'Pedro Henrique Martins', ...RAFAEL, date: daysFromNow(3, 14), status: 'agendado', reason: 'Acompanhamento — ansiedade', summary: '', documents: [] },
  { id: 'at-104', patientCpf: MOCK_CPFS.joao, patientName: 'João Pedro Oliveira Santos', ...RAFAEL, date: daysFromNow(6, 8, 30), status: 'agendado', reason: 'Check-up anual', summary: '', documents: [] },
  { id: 'at-105', patientCpf: MOCK_CPFS.carlos, patientName: 'Carlos Eduardo Ribeiro', ...CAMILA, date: daysFromNow(2, 15), status: 'agendado', reason: 'Retorno cardiológico', summary: '', documents: [] },

  // Atendimentos passados
  {
    id: 'at-001', patientCpf: MOCK_CPFS.maria, patientName: 'Maria Aparecida da Silva', ...RAFAEL, date: daysFromNow(-60, 9), status: 'realizado',
    reason: 'Rotina — diabetes e hipertensão',
    summary: 'PA 132/84 mmHg. Glicemia de jejum 148 mg/dL. Solicitados HbA1c e perfil lipídico. Reforçadas orientações alimentares.',
    documents: [{ id: 'doc-1', fileName: 'pedido_exames_maria.pdf', type: 'outro', uploadedAt: daysFromNow(-60, 9, 40) }],
  },
  {
    id: 'at-002', patientCpf: MOCK_CPFS.ana, patientName: 'Ana Luiza Ferreira Costa', ...RAFAEL, date: daysFromNow(-41, 11), status: 'realizado',
    reason: 'Cansaço e tontura',
    summary: 'Queixa de fadiga há 2 meses. Hemograma evidenciou anemia ferropriva leve. Iniciado sulfato ferroso. Retorno em 6 semanas.',
    documents: [{ id: 'doc-2', fileName: 'receita_sulfato_ferroso.pdf', type: 'receita', uploadedAt: daysFromNow(-41, 11, 30) }],
  },
  {
    id: 'at-003', patientCpf: MOCK_CPFS.pedro, patientName: 'Pedro Henrique Martins', ...RAFAEL, date: daysFromNow(-25, 16), status: 'realizado',
    reason: 'Retorno — sertralina',
    summary: 'Boa adesão e melhora parcial dos sintomas ansiosos. Mantida dose. Encaminhado para psicoterapia.',
    documents: [],
  },
  {
    id: 'at-004', patientCpf: MOCK_CPFS.beatriz, patientName: 'Beatriz Souza Almeida', ...RAFAEL, date: daysFromNow(-12, 10), status: 'realizado',
    reason: 'Orientação sobre alergia alimentar',
    summary: 'Revisado plano de ação para anafilaxia com a responsável. Renovada prescrição de adrenalina autoinjetável.',
    documents: [{ id: 'doc-3', fileName: 'plano_anafilaxia_beatriz.pdf', type: 'laudo', uploadedAt: daysFromNow(-12, 10, 25) }],
  },
  {
    id: 'at-005', patientCpf: MOCK_CPFS.carlos, patientName: 'Carlos Eduardo Ribeiro', ...CAMILA, date: daysFromNow(-160, 14), status: 'realizado',
    reason: 'Retorno pós-angioplastia',
    summary: 'Assintomático. Ecocardiograma com FE 52%. Mantida terapia antiplaquetária e estatina de alta potência.',
    documents: [{ id: 'doc-4', fileName: 'laudo_ecocardiograma.pdf', type: 'laudo', uploadedAt: daysFromNow(-160, 14, 30) }],
  },
]
