// Lista inicial das regiões de saúde (mesma de frontend/src/mocks/regional.ts), usada pelo seed.
// A fonte da verdade é a coleção "regions" (GET /regions): o cadastro de paciente valida por ela.

export const REGIONS = [
  'Grande São Paulo',
  'Campinas',
  'Baixada Santista',
  'Vale do Paraíba',
  'Sorocaba',
  'Ribeirão Preto',
] as const

export type Region = (typeof REGIONS)[number]
