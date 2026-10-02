import type { RegionalRecord } from '../types'

// Regiões de saúde do estado de SP usadas no painel do gestor
export const REGIONS = [
  'Grande São Paulo',
  'Campinas',
  'Baixada Santista',
  'Vale do Paraíba',
  'Sorocaba',
  'Ribeirão Preto',
]

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

// Porte de cada região (multiplicador do volume de atendimentos)
const REGION_SIZE: Record<string, number> = {
  'Grande São Paulo': 5.2,
  Campinas: 2.1,
  'Baixada Santista': 1.3,
  'Vale do Paraíba': 1.2,
  Sorocaba: 1.1,
  'Ribeirão Preto': 1,
}

// Gerador pseudoaleatório determinístico: os gráficos ficam iguais a cada carregamento
function seededRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Últimos N meses (incluindo o atual) no formato AAAA-MM */
export function lastMonths(count = 12): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

function buildRegionalData(): RegionalRecord[] {
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

export const mockRegionalData: RegionalRecord[] = buildRegionalData()
