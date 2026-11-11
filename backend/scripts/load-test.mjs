// Teste de carga simples (sem instalar nada): bate no login da API com N usuários simultâneos
// e mostra requisições por segundo, tempo de resposta e erros. Serve para ver o auto scaling
// da AWS agir: o login usa bcrypt (gasta CPU) e faz só 1 leitura no banco, então a CPU sobe
// sem estourar o limite de 100 operações/s do Atlas gratuito.
//
//   node backend/scripts/load-test.mjs <url-da-api> [--duracao 300] [--usuarios 20] [--saida resultado.json]
//   ex.: node backend/scripts/load-test.mjs https://dxxxx.cloudfront.net --duracao 600 --usuarios 20
//
// Enquanto roda, acompanhe o dashboard "saude-unificada-api" no CloudWatch.

import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const base = (args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--')) ?? 'http://localhost:3000')
  .replace(/\/$/, '')
  .replace(/\/api$/, '')
const durationSec = Number(option('duracao', 120))
const users = Number(option('usuarios', 10))
const output = option('saida', undefined)

const url = `${base}/api/auth/login`
const body = JSON.stringify({ email: 'medico@teste.com', password: '123456' })

const all = [] // { t, ms, status }
let window = []
const startedAt = Date.now()
const endsAt = startedAt + durationSec * 1000

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

function summary(list) {
  const ms = list.map((r) => r.ms)
  const errors = list.filter((r) => r.status !== 200).length
  return { requests: list.length, errors, p50: percentile(ms, 50), p95: percentile(ms, 95), max: Math.max(0, ...ms) }
}

async function worker() {
  while (Date.now() < endsAt) {
    const t0 = performance.now()
    let status = 0
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      status = res.status
      await res.arrayBuffer()
    } catch {
      status = 0 // falha de rede / timeout
    }
    const record = { t: Date.now() - startedAt, ms: Math.round(performance.now() - t0), status }
    all.push(record)
    window.push(record)
  }
}

console.log(`Carga em ${url}: ${users} usuários simultâneos por ${durationSec}s\n`)
console.log('tempo   req/s   p50(ms)  p95(ms)  erros')
const ticker = setInterval(() => {
  const s = summary(window)
  const elapsed = Math.round((Date.now() - startedAt) / 1000)
  console.log(
    `${String(elapsed).padStart(4)}s  ${(s.requests / 15).toFixed(1).padStart(6)}  ${String(s.p50).padStart(7)}  ${String(s.p95).padStart(7)}  ${String(s.errors).padStart(5)}`,
  )
  window = []
}, 15_000)

await Promise.all(Array.from({ length: users }, worker))
clearInterval(ticker)

const total = summary(all)
const statusCounts = all.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
const result = {
  url,
  users,
  durationSec,
  startedAt: new Date(startedAt).toISOString(),
  requests: total.requests,
  requestsPerSecond: Number((total.requests / durationSec).toFixed(2)),
  latencyMs: { p50: total.p50, p95: total.p95, max: total.max },
  errors: total.errors,
  errorRate: Number(((total.errors / Math.max(1, total.requests)) * 100).toFixed(2)),
  statusCounts,
}
console.log('\nResultado:', JSON.stringify(result, null, 2))
if (output) {
  writeFileSync(output, `${JSON.stringify({ ...result, samples: all }, null, 2)}\n`)
  console.log(`\nDetalhes salvos em ${output}`)
}
