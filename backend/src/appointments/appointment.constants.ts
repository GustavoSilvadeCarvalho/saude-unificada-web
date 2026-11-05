// Valores fixos dos atendimentos (ver docs/API_CONTRACT.md)

export const APPOINTMENT_STATUSES = ['realizado', 'agendado'] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const DOCUMENT_TYPES = ['receita', 'laudo', 'exame', 'outro'] as const
export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/** Resumo mínimo de um atendimento realizado (mesma regra do formulário do site) */
export const MIN_SUMMARY_LENGTH = 10

/** Folga para diferença de relógio entre o computador do médico e o servidor */
export const CLOCK_TOLERANCE_MS = 5 * 60 * 1000
