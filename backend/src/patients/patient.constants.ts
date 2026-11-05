// Valores fixos do prontuário (ver docs/API_CONTRACT.md)

export const SEXES = ['F', 'M', 'Outro'] as const
export type Sex = (typeof SEXES)[number]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não informado'] as const
export type BloodType = (typeof BLOOD_TYPES)[number]

export const ALLERGY_SEVERITIES = ['leve', 'moderada', 'grave'] as const
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number]

export const CONDITION_STATUSES = ['ativa', 'controlada', 'resolvida'] as const
export type ConditionStatus = (typeof CONDITION_STATUSES)[number]
