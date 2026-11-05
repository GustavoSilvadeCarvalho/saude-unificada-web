// Regiões de saúde atendidas (mesma lista de frontend/src/mocks/regional.ts).
// No bloco 9 elas passam a vir da coleção "regions" (GET /regions).

export const REGIONS = [
  'Grande São Paulo',
  'Campinas',
  'Baixada Santista',
  'Vale do Paraíba',
  'Sorocaba',
  'Ribeirão Preto',
] as const

export type Region = (typeof REGIONS)[number]
