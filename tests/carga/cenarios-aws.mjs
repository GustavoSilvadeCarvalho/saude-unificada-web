// Roda os cenários C02, C03 e C04 do teste de carga na AWS e guarda as evidências em tests/relatorios/.
// Precisa só do Node 20+ e da AWS CLI configurada (funciona no Windows e no Linux).
//
//   node tests/carga/cenarios-aws.mjs [--usuarios 20] [--c02 300] [--c03 600] [--c04 1800] [--cenarios C02,C03,C04]
//
// Antes: suba a API com o limite de login desligado (cd infra && npm run deploy:api -- -c loginRateLimit=false).
// Depois: religue o limite (npm run deploy:api) ou derrube a API (npm run destroy:api).
//
//   C02  auto scaling travado em 1 tarefa, carga por --c02 segundos (limite de 1 tarefa)
//   C03  auto scaling liberado (1 a 3), carga por --c03 segundos (as tarefas sobem e o p95 cai)
//   C04  sem carga, espera até --c04 segundos o auto scaling voltar para 1 tarefa
//
// Enquanto roda, deixe aberto o dashboard "saude-unificada-api" do CloudWatch para os prints.

import { execFile, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const LOAD_TEST = join(ROOT, 'backend', 'scripts', 'load-test.mjs')
const REPORTS = join(ROOT, 'tests', 'relatorios')
const REGION = process.env.AWS_REGION ?? 'us-east-1'
const STACK = 'SaudeUnificadaApi'
const POLL_MS = Number(process.env.POLL_MS ?? 20_000)

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const users = Number(option('usuarios', 20))
const durations = { C02: Number(option('c02', 300)), C03: Number(option('c03', 600)), C04: Number(option('c04', 1800)) }
const scenarios = option('cenarios', 'C02,C03,C04').toUpperCase().split(',')
const day = new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD no fuso da máquina

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const now = () => new Date().toISOString()
const log = (msg) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`)

async function aws(...params) {
  try {
    const { stdout } = await run('aws', [...params, '--region', REGION, '--output', 'json'], { maxBuffer: 20 * 1024 * 1024 })
    return stdout.trim() ? JSON.parse(stdout) : null
  } catch (error) {
    const lines = (error.stderr || error.message || '').trim().split('\n')
    const detail = lines.find((l) => /error|denied|not found|does not exist/i.test(l)) ?? lines.pop()
    throw new Error(`aws ${params.slice(0, 2).join(' ')} falhou: ${detail}`)
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

// ---------- Descobre a stack ----------
async function discover() {
  const stack = (await aws('cloudformation', 'describe-stacks', '--stack-name', STACK)).Stacks[0]
  const outputs = Object.fromEntries(stack.Outputs.map((o) => [o.OutputKey, o.OutputValue]))
  const resources = (await aws('cloudformation', 'describe-stack-resources', '--stack-name', STACK)).StackResources
  const physical = (type) => resources.find((r) => r.ResourceType === type)?.PhysicalResourceId
  const albArn = physical('AWS::ElasticLoadBalancingV2::LoadBalancer')
  const targetGroupArn = physical('AWS::ElasticLoadBalancingV2::TargetGroup')
  return {
    apiUrl: outputs.ApiUrl,
    dashboardUrl: outputs.DashboardUrl,
    cluster: outputs.ClusterName,
    service: outputs.ServiceName,
    resourceId: `service/${outputs.ClusterName}/${outputs.ServiceName}`,
    targetGroupArn,
    albDimension: albArn.split(':loadbalancer/')[1],
    targetGroupDimension: `targetgroup/${targetGroupArn.split(':targetgroup/')[1]}`,
  }
}

async function taskEnvironment(ctx) {
  const service = (await aws('ecs', 'describe-services', '--cluster', ctx.cluster, '--services', ctx.service)).services[0]
  const taskDef = (await aws('ecs', 'describe-task-definition', '--task-definition', service.taskDefinition)).taskDefinition
  const env = Object.fromEntries(taskDef.containerDefinitions[0].environment.map((e) => [e.name, e.value]))
  const capacity = service.capacityProviderStrategy?.map((c) => c.capacityProvider).join(', ') || service.launchType
  return { env, capacity, cpu: taskDef.cpu, memory: taskDef.memory }
}

// ---------- Estado do serviço (linha do tempo) ----------
async function serviceState(ctx) {
  const [svc, health] = await Promise.all([
    aws('ecs', 'describe-services', '--cluster', ctx.cluster, '--services', ctx.service),
    aws('elbv2', 'describe-target-health', '--target-group-arn', ctx.targetGroupArn),
  ])
  const s = svc.services[0]
  const healthy = health.TargetHealthDescriptions.filter((t) => t.TargetHealth.State === 'healthy').length
  return { at: now(), desired: s.desiredCount, running: s.runningCount, pending: s.pendingCount, healthy }
}

function startTimeline(ctx, phase, timeline) {
  let stopped = false
  let last = ''
  const loop = (async () => {
    while (!stopped) {
      try {
        const state = { phase, ...(await serviceState(ctx)) }
        timeline.push(state)
        const line = `tarefas: desejadas ${state.desired}, rodando ${state.running}, saudáveis no ALB ${state.healthy}`
        if (line !== last) log(`${phase} ${line}`)
        last = line
      } catch (error) {
        log(`${phase} não consegui ler o estado do serviço: ${error.message}`)
      }
      await sleep(POLL_MS)
    }
  })()
  return async () => {
    stopped = true
    await loop
  }
}

async function waitFor(ctx, phase, timeline, condition, timeoutSec, description) {
  log(`${phase} esperando ${description} (até ${Math.round(timeoutSec / 60)} min)`)
  const deadline = Date.now() + timeoutSec * 1000
  while (Date.now() < deadline) {
    const state = { phase, ...(await serviceState(ctx)) }
    timeline.push(state)
    if (condition(state)) {
      log(`${phase} ok: desejadas ${state.desired}, rodando ${state.running}, saudáveis ${state.healthy}`)
      return { reached: true, at: state.at }
    }
    await sleep(POLL_MS)
  }
  log(`${phase} tempo esgotado esperando ${description}`)
  return { reached: false, at: now() }
}

async function setCapacity(ctx, min, max) {
  await aws(
    'application-autoscaling', 'register-scalable-target',
    '--service-namespace', 'ecs',
    '--scalable-dimension', 'ecs:service:DesiredCount',
    '--resource-id', ctx.resourceId,
    '--min-capacity', String(min),
    '--max-capacity', String(max),
  )
  log(`auto scaling: mínimo ${min}, máximo ${max}`)
}

// ---------- Carga ----------
function loadTest(apiUrl, durationSec, rawFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [LOAD_TEST, apiUrl, '--duracao', String(durationSec), '--usuarios', String(users), '--saida', rawFile],
      { stdio: 'inherit' },
    )
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`load-test terminou com código ${code}`))))
  })
}

function loadSummary(rawFile, scenario, extra) {
  const raw = JSON.parse(readFileSync(rawFile, 'utf8'))
  const { samples, ...result } = raw
  const intervals = []
  for (let start = 0; start < raw.durationSec * 1000; start += 60_000) {
    const slice = samples.filter((s) => s.t >= start && s.t < start + 60_000)
    if (slice.length === 0) continue
    intervals.push({
      minuto: start / 60_000 + 1,
      requisicoesPorSegundo: Number((slice.length / (Math.min(60_000, raw.durationSec * 1000 - start) / 1000)).toFixed(2)),
      p50: percentile(slice.map((s) => s.ms), 50),
      p95: percentile(slice.map((s) => s.ms), 95),
      erros: slice.filter((s) => s.status !== 200).length,
    })
  }
  const lastTwoMinutes = samples.filter((s) => s.t >= raw.durationSec * 1000 - 120_000).map((s) => s.ms)
  return { cenario: scenario, ...result, p95UltimosDoisMinutos: percentile(lastTwoMinutes, 95), porMinuto: intervals, ...extra }
}

// ---------- Métricas do CloudWatch (mesmos gráficos do dashboard) ----------
async function cloudWatchMetrics(ctx, start, end) {
  const ecs = [{ Name: 'ClusterName', Value: ctx.cluster }, { Name: 'ServiceName', Value: ctx.service }]
  const alb = [{ Name: 'LoadBalancer', Value: ctx.albDimension }]
  const tg = [{ Name: 'LoadBalancer', Value: ctx.albDimension }, { Name: 'TargetGroup', Value: ctx.targetGroupDimension }]
  const query = (Id, Namespace, MetricName, Dimensions, Stat) => ({
    Id,
    MetricStat: { Metric: { Namespace, MetricName, Dimensions }, Period: 60, Stat },
  })
  const queries = [
    query('cpuMedia', 'AWS/ECS', 'CPUUtilization', ecs, 'Average'),
    query('memoriaMedia', 'AWS/ECS', 'MemoryUtilization', ecs, 'Average'),
    query('tarefasSaudaveis', 'AWS/ApplicationELB', 'HealthyHostCount', tg, 'Maximum'),
    query('requisicoes', 'AWS/ApplicationELB', 'RequestCount', alb, 'Sum'),
    query('latenciaP95', 'AWS/ApplicationELB', 'TargetResponseTime', alb, 'p95'),
    query('erros5xx', 'AWS/ApplicationELB', 'HTTPCode_Target_5XX_Count', alb, 'Sum'),
  ]
  const data = await aws(
    'cloudwatch', 'get-metric-data',
    '--start-time', start,
    '--end-time', end,
    '--metric-data-queries', JSON.stringify(queries),
    '--scan-by', 'TimestampAscending',
  )
  return Object.fromEntries(
    data.MetricDataResults.map((r) => [
      r.Id,
      r.Timestamps.map((t, i) => ({ at: t, valor: Number(r.Values[i].toFixed(r.Id === 'latenciaP95' ? 3 : 1)) })),
    ]),
  )
}

// ---------- Execução ----------
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)

async function main() {
  mkdirSync(REPORTS, { recursive: true })
  log(`descobrindo a stack ${STACK} em ${REGION}...`)
  const ctx = await discover()
  const task = await taskEnvironment(ctx)
  log(`API: ${ctx.apiUrl}`)
  log(`dashboard: ${ctx.dashboardUrl}`)

  if (task.env.LOGIN_RATE_LIMIT !== '0') {
    console.error(
      '\nO limite de tentativas de login está ligado na AWS: a carga levaria 429 em vez de gastar CPU.\n' +
        'Suba a API com ele desligado e rode de novo:\n\n  cd infra && npm run deploy:api -- -c loginRateLimit=false\n',
    )
    process.exit(1)
  }

  const ambiente = {
    regiao: REGION,
    tarefa: `${Number(task.cpu) / 1024} vCPU, ${task.memory} MB (${task.capacity})`,
    autoScaling: 'CPU média com alvo de 50%, 1 a 3 tarefas',
    limiteDeLogin: 'desligado (LOGIN_RATE_LIMIT=0)',
    geradorDeCarga: `${os.cpus()[0]?.model.trim()} (${os.cpus().length} núcleos), ${os.platform()}, Node ${process.version}`,
    usuariosSimultaneos: users,
  }
  const timeline = []
  const results = {}
  const startedAt = now()
  const rawFile = join(os.tmpdir(), `carga-aws-${process.pid}.json`)

  try {
    if (scenarios.includes('C02')) {
      await setCapacity(ctx, 1, 1)
      await waitFor(ctx, 'C02', timeline, (s) => s.desired === 1 && s.running === 1 && s.healthy === 1, 600, '1 tarefa saudável')
      log(`C02 carga com ${users} usuários por ${durations.C02}s (1 tarefa fixa)`)
      const stop = startTimeline(ctx, 'C02', timeline)
      await loadTest(ctx.apiUrl, durations.C02, rawFile)
      await stop()
      results.C02 = loadSummary(rawFile, 'C02 - 1 tarefa fixa', { ambiente })
      writeJson(join(REPORTS, `carga-aws-c02-${day}.json`), results.C02)
    }

    if (scenarios.includes('C03')) {
      await setCapacity(ctx, 1, 3)
      log(`C03 carga com ${users} usuários por ${durations.C03}s (auto scaling 1 a 3)`)
      const stop = startTimeline(ctx, 'C03', timeline)
      await loadTest(ctx.apiUrl, durations.C03, rawFile)
      await stop()
      const phase = timeline.filter((s) => s.phase === 'C03')
      results.C03 = loadSummary(rawFile, 'C03 - auto scaling 1 a 3', {
        tarefasNoMaximo: Math.max(0, ...phase.map((s) => s.running)),
        tarefasSaudaveisNoMaximo: Math.max(0, ...phase.map((s) => s.healthy)),
        ambiente,
      })
      writeJson(join(REPORTS, `carga-aws-c03-${day}.json`), results.C03)
    }

    if (scenarios.includes('C04')) {
      await setCapacity(ctx, 1, 3)
      const wait = await waitFor(ctx, 'C04', timeline, (s) => s.desired === 1 && s.running === 1, durations.C04, 'voltar para 1 tarefa')
      results.C04 = { cenario: 'C04 - volta ao normal', voltouParaUmaTarefa: wait.reached, em: wait.at }
    }
  } finally {
    // Garante o auto scaling normal (1 a 3) mesmo se algo der errado no meio
    await setCapacity(ctx, 1, 3).catch((error) => log(`não consegui restaurar o auto scaling: ${error.message}`))
    rmSync(rawFile, { force: true })
  }

  const endedAt = now()
  log('coletando histórico do auto scaling e métricas do CloudWatch...')
  const activities = (
    await aws(
      'application-autoscaling', 'describe-scaling-activities',
      '--service-namespace', 'ecs',
      '--resource-id', ctx.resourceId,
      '--max-items', '20',
    )
  ).ScalingActivities.filter((a) => new Date(a.StartTime) >= new Date(startedAt)) // a CLI devolve horário com fuso, não em UTC
  const metricsStart = new Date(new Date(startedAt).getTime() - 5 * 60_000).toISOString()
  const metrics = await cloudWatchMetrics(ctx, metricsStart, endedAt)

  const criteria = []
  for (const [id, r] of Object.entries(results)) {
    if (r.errorRate !== undefined) criteria.push({ criterio: `${id}: taxa de erro < 1%`, valor: `${r.errorRate}%`, ok: r.errorRate < 1 })
  }
  if (results.C03) {
    criteria.push({ criterio: 'C03: auto scaling chega a pelo menos 2 tarefas', valor: results.C03.tarefasNoMaximo, ok: results.C03.tarefasNoMaximo >= 2 })
  }
  if (results.C02 && results.C03) {
    criteria.push({
      criterio: 'C03: p95 do fim da carga menor que o p95 do C02',
      valor: `${results.C03.p95UltimosDoisMinutos} ms (C03, últimos 2 min) x ${results.C02.latencyMs.p95} ms (C02)`,
      ok: results.C03.p95UltimosDoisMinutos < results.C02.latencyMs.p95,
    })
  }
  if (results.C04) criteria.push({ criterio: 'C04: volta para 1 tarefa sem carga', valor: results.C04.em, ok: results.C04.voltouParaUmaTarefa })

  const evidence = {
    data: day,
    inicio: startedAt,
    fim: endedAt,
    api: ctx.apiUrl,
    dashboard: ctx.dashboardUrl,
    ambiente,
    criterios: criteria,
    resultados: Object.fromEntries(
      Object.entries(results).map(([id, r]) => [
        id,
        r.requests === undefined
          ? r
          : { requisicoes: r.requests, requisicoesPorSegundo: r.requestsPerSecond, latenciaMs: r.latencyMs, p95UltimosDoisMinutos: r.p95UltimosDoisMinutos, taxaDeErro: r.errorRate, tarefasNoMaximo: r.tarefasNoMaximo },
      ]),
    ),
    linhaDoTempo: timeline,
    atividadesDoAutoScaling: activities.map((a) => ({ inicio: a.StartTime, fim: a.EndTime, status: a.StatusCode, descricao: a.Description, causa: a.Cause })),
    metricasCloudWatch: metrics,
  }
  const evidenceFile = join(REPORTS, `escalabilidade-aws-${day}.json`)
  writeJson(evidenceFile, evidence)

  console.log('\n================ Resultado ================')
  for (const c of criteria) console.log(`${c.ok ? 'OK  ' : 'FALHOU'}  ${c.criterio}: ${c.valor}`)
  console.log('\nLinhas para a tabela de carga do relatório de qualidade:')
  for (const [id, r] of Object.entries(results)) {
    if (r.requests === undefined) continue
    console.log(`| ${id} | ${r.users} | ${r.durationSec} s | ${r.requestsPerSecond} req/s | p50 ${r.latencyMs.p50} ms, p95 ${r.latencyMs.p95} ms | ${r.errorRate}% |${r.tarefasNoMaximo ? ` até ${r.tarefasNoMaximo} tarefas |` : ' 1 tarefa |'}`)
  }
  console.log(`\nEvidências salvas em tests/relatorios/ (${evidenceFile.split(/[\\/]/).pop()} e carga-aws-*-${day}.json).`)
  console.log('Não esqueça: os prints do dashboard e religar o limite de login (cd infra && npm run deploy:api) ou derrubar a API (npm run destroy:api).')
}

main().catch((error) => {
  console.error(`\nErro: ${error.message}`)
  process.exit(1)
})
