// Teste de fumaça: confere, numa API já no ar (com o seed aplicado), que o básico funciona.
// Roda em qualquer lugar com Node 20+ (Windows, CI, contra a AWS):
//   node backend/scripts/smoke-test.mjs                         (padrão: http://localhost:3000)
//   node backend/scripts/smoke-test.mjs https://api.exemplo.com
// Sai com código 1 se alguma verificação falhar.

const base = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '') + '/api'
const MARIA = '22916926402'

async function call(path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text()
  return { status: res.status, data }
}

const checks = []
async function check(name, run) {
  const start = performance.now()
  try {
    const detail = await run()
    checks.push({ ok: true, name, detail, ms: Math.round(performance.now() - start) })
  } catch (error) {
    checks.push({ ok: false, name, detail: error.message, ms: Math.round(performance.now() - start) })
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message)
}

let medico
let gestor
let paciente

await check('API e MongoDB no ar (GET /health)', async () => {
  const { status, data } = await call('/health')
  expect(status === 200 && data.mongodb === 'up', `status ${status}: ${JSON.stringify(data)}`)
  return `mongodb ${data.mongodb}`
})
await check('Login do médico (e-mail)', async () => {
  const { status, data } = await call('/auth/login', { body: { email: 'medico@teste.com', password: '123456' } })
  expect(status === 200 && data.token, `status ${status} (o seed foi aplicado?)`)
  medico = data.token
  return data.user.name
})
await check('Prontuário unificado (GET /patients/:cpf)', async () => {
  const { status, data } = await call(`/patients/${MARIA}`, { token: medico })
  expect(status === 200, `status ${status}`)
  return `${data.fullName}: ${data.allergies.length} alergias, ${data.appointmentSummaries.length} atendimento(s)`
})
await check('Agenda do médico (GET /appointments)', async () => {
  const me = await call('/auth/me', { token: medico })
  const { status, data } = await call(`/appointments?doctorId=${me.data.id}`, { token: medico })
  expect(status === 200 && Array.isArray(data), `status ${status}`)
  return `${data.length} atendimentos`
})
await check('Painel do gestor (GET /regional-data)', async () => {
  const login = await call('/auth/login', { body: { email: 'gestor@teste.com', password: '123456' } })
  gestor = login.data.token
  const { status, data } = await call('/regional-data', { token: gestor })
  expect(status === 200 && data.length > 0, `status ${status}`)
  return `${data.length} linhas`
})
await check('Login do paciente no app (CPF)', async () => {
  const { status, data } = await call('/auth/patient-login', { body: { cpf: MARIA, password: 'paciente123' } })
  expect(status === 200 && data.user.role === 'paciente', `status ${status}`)
  paciente = data.token
  return data.user.name
})
await check('Carteira digital (GET /me/record)', async () => {
  const { status, data } = await call('/me/record', { token: paciente })
  expect(status === 200 && data.cpf === MARIA, `status ${status}`)
  return `tipo sanguíneo ${data.bloodType}`
})
await check('Perfil errado é barrado (paciente em /regional-data)', async () => {
  const { status } = await call('/regional-data', { token: paciente })
  expect(status === 403, `esperado 403, veio ${status}`)
  return '403'
})
await check('Swagger (GET /docs-json)', async () => {
  const { status, data } = await call('/docs-json')
  expect(status === 200, `status ${status}`)
  return `${Object.keys(data.paths).length} rotas documentadas`
})

console.log(`\nTeste de fumaça em ${base}\n`)
for (const c of checks) console.log(`${c.ok ? '✔' : '✘'} ${c.name} (${c.ms} ms): ${c.detail}`)
const failed = checks.filter((c) => !c.ok).length
console.log(`\n${checks.length - failed}/${checks.length} verificações passaram.`)
process.exit(failed ? 1 : 0)
