// Dados regionais de demonstração, com o mesmo gerador de frontend/src/mocks/regional.ts
// (mesma semente, então os gráficos do painel ficam iguais aos do modo mock).
// Representam os totais que chegariam já agregados dos sistemas municipais integrados.

import { REGIONS } from '../common/regions.js'
import { todayDateOnly } from '../common/validators.js'

export interface RegionalRecord {
  region: string
  month: string
  appointments: number
  uniquePatients: number
  conditions: { name: string; count: number }[]
}

const CONDITIONS = [
  'Hipertensão',
  'Diabetes tipo 2',
  'Infecções respiratórias',
  'Ansiedade e depressão',
  'Dengue',
  'Asma',
  'Lombalgia',
  'Obesidade',
]

/** Porte de cada região (multiplicador do volume de atendimentos) */
const REGION_SIZE: Record<string, number> = {
  'Grande São Paulo': 5.2,
  Campinas: 2.1,
  'Baixada Santista': 1.3,
  'Vale do Paraíba': 1.2,
  Sorocaba: 1.1,
  'Ribeirão Preto': 1,
}

/** Gerador pseudoaleatório determinístico (os números são sempre os mesmos) */
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Os últimos `count` meses completos (sem o mês atual), em AAAA-MM, do mais antigo ao mais recente */
export function lastMonths(count = 12): string[] {
  const [year, month] = todayDateOnly().split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - 1 - (count - i), 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

export function buildRegionalData(): RegionalRecord[] {
  const random = seededRandom(42)
  const records: RegionalRecord[] = []

  for (const region of REGIONS) {
    for (const month of lastMonths()) {
      const monthNumber = Number(month.slice(5))
      // Sazonalidade: dengue no verão/outono, respiratórias no inverno
      const dengueFactor = [1, 2, 3, 4, 5].includes(monthNumber) ? 1.8 : 0.25
      const respiratoryFactor = [5, 6, 7, 8].includes(monthNumber) ? 2.2 : 1
      const size = REGION_SIZE[region]

      const conditions = CONDITIONS.map((name) => {
        let base = 180 + random() * 140
        if (name === 'Dengue') base *= dengueFactor
        if (name === 'Infecções respiratórias') base *= respiratoryFactor
        if (name === 'Hipertensão') base *= 1.6
        return { name, count: Math.round(base * size) }
      }).sort((a, b) => b.count - a.count)

      const appointments = Math.round(conditions.reduce((sum, c) => sum + c.count, 0) * (1.25 + random() * 0.2))
      records.push({
        region,
        month,
        appointments,
        uniquePatients: Math.round(appointments * (0.62 + random() * 0.08)),
        conditions,
      })
    }
  }
  return records
}
