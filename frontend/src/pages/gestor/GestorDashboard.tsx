import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Input'
import { Loading } from '../../components/ui/Spinner'
import { useApi } from '../../hooks/useApi'
import { getRegionalData, getRegions } from '../../services/api'
import { formatMonth, formatNumber, lastMonths } from '../../utils/format'

// Cores dos gráficos: série única na cor primária; demais regiões em cinza quando há destaque
const CHART_COLOR = '#1f5d57'
const MUTED_COLOR = '#cbd5e1'
const GRID_COLOR = '#e2e8f0'
const AXIS_TEXT = { fill: '#475569', fontSize: 12 }

const MONTHS = lastMonths(12)
const PRESETS = [3, 6, 12]

/** Um número do resumo: rótulo, valor e uma linha de contexto (sem ícone, como numa planilha) */
function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="bg-white px-5 py-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={`mt-1 font-semibold leading-tight tabular-nums text-slate-900 ${/\d/.test(value) ? 'text-2xl' : 'text-xl'}`}>{value}</dd>
      {detail && <dd className="mt-0.5 text-sm text-slate-500">{detail}</dd>}
    </div>
  )
}

/** Tabela com os dados do gráfico, para leitores de tela e consulta dos números exatos */
function DataTable({ caption, headers, rows }: { caption: string; headers: [string, string]; rows: [string, number][] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-medium text-brand-700 hover:underline">Ver dados em tabela</summary>
      <table className="mt-2 w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-1.5 font-medium">{headers[0]}</th>
            <th className="py-1.5 text-right font-medium">{headers[1]}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} className="border-b border-slate-100">
              <td className="py-1.5 text-slate-700">{label}</td>
              <td className="py-1.5 text-right tabular-nums text-slate-900">{formatNumber(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card title={title}>
      <p className="-mt-1 mb-4 text-sm text-slate-500">{description}</p>
      {children}
    </Card>
  )
}

const tooltipStyle = {
  contentStyle: { borderRadius: 4, borderColor: '#cbd5e1', fontSize: 13 },
  cursor: { fill: 'rgba(31, 93, 87, 0.08)' },
  formatter: (value: unknown) => [formatNumber(Number(value)), 'Atendimentos'] as [string, string],
}

export default function GestorDashboard() {
  const [region, setRegion] = useState('')
  const [from, setFrom] = useState(MONTHS[MONTHS.length - 6])
  const [to, setTo] = useState(MONTHS[MONTHS.length - 1])

  const { data: regions } = useApi(getRegions, [])
  // Busca todas as regiões do período: o gráfico por região compara todas e destaca a selecionada
  const { data, loading, error } = useApi(() => getRegionalData({ from, to }), [from, to])

  const stats = useMemo(() => {
    const all = data ?? []
    const filtered = region ? all.filter((r) => r.region === region) : all

    const byRegion = new Map<string, number>()
    for (const r of all) byRegion.set(r.region, (byRegion.get(r.region) ?? 0) + r.appointments)

    const byMonth = new Map<string, number>()
    const byCondition = new Map<string, number>()
    let totalAppointments = 0
    let totalPatients = 0
    for (const r of filtered) {
      totalAppointments += r.appointments
      totalPatients += r.uniquePatients
      byMonth.set(r.month, (byMonth.get(r.month) ?? 0) + r.appointments)
      for (const c of r.conditions) byCondition.set(c.name, (byCondition.get(c.name) ?? 0) + c.count)
    }

    const regionData = [...byRegion].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const monthData = [...byMonth].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, label: formatMonth(month), value }))
    const conditionData = [...byCondition].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)

    // Variação do último mês do período em relação ao anterior
    const last = monthData.at(-1)?.value ?? 0
    const previous = monthData.at(-2)?.value ?? 0
    const variation = previous ? ((last - previous) / previous) * 100 : null

    return {
      totalAppointments,
      totalPatients,
      monthlyAverage: monthData.length ? Math.round(totalAppointments / monthData.length) : 0,
      topCondition: conditionData[0],
      variation,
      regionData,
      monthData,
      conditionData,
    }
  }, [data, region])

  function applyPreset(months: number) {
    setFrom(MONTHS[MONTHS.length - months])
    setTo(MONTHS[MONTHS.length - 1])
  }

  // Mantém o intervalo válido: "de" nunca depois de "até"
  function changeFrom(value: string) {
    setFrom(value)
    if (value > to) setTo(value)
  }
  function changeTo(value: string) {
    setTo(value)
    if (value < from) setFrom(value)
  }

  const monthOptions = MONTHS.map((m) => ({ value: m, label: formatMonth(m) }))
  const periodLabel = `${formatMonth(from)} a ${formatMonth(to)}`
  const scopeLabel = region || 'todas as regiões'

  return (
    <>
      <PageHeader title="Painel regional" description="Atendimentos por região de saúde de SP. São só totais: nenhum paciente aparece aqui." />

      {/* Filtros */}
      <Card as="div" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
          <Select
            label="Região"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            options={[{ value: '', label: 'Todas as regiões' }, ...(regions ?? []).map((r) => ({ value: r, label: r }))]}
          />
          <Select label="De" value={from} onChange={(e) => changeFrom(e.target.value)} options={monthOptions} />
          <Select label="Até" value={to} onChange={(e) => changeTo(e.target.value)} options={monthOptions} />
          <div role="group" aria-label="Períodos rápidos" className="flex divide-x divide-slate-300 overflow-hidden rounded-md border border-slate-300 bg-white sm:col-span-2 lg:col-span-1">
            {PRESETS.map((p) => {
              const active = from === MONTHS[MONTHS.length - p] && to === MONTHS[MONTHS.length - 1]
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  onClick={() => applyPreset(p)}
                  className={`flex-1 whitespace-nowrap px-3 py-2.5 text-sm font-medium ${active ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {p} meses
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      {loading && !data ? (
        <Loading label="Carregando indicadores..." />
      ) : (
        <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : ''}>
          <p className="mb-4 max-w-3xl text-slate-700" aria-live="polite">
            De <strong>{periodLabel}</strong>, {region ? <strong>{region}</strong> : 'o conjunto das regiões'} registrou{' '}
            <strong>{formatNumber(stats.totalAppointments)} atendimentos</strong>
            {stats.topCondition && (
              <>
                , e a condição mais registrada foi <strong>{stats.topCondition.name.toLowerCase()}</strong>
              </>
            )}
            .
            {stats.variation !== null &&
              ` No último mês, o número ${stats.variation >= 0 ? 'subiu' : 'caiu'} ${Math.abs(stats.variation).toFixed(1).replace('.', ',')}% em relação ao mês anterior.`}
          </p>

          {/* Indicadores */}
          <dl className="mb-6 grid gap-px overflow-hidden rounded-lg border border-slate-300 bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Atendimentos" value={formatNumber(stats.totalAppointments)} detail={`${stats.monthData.length} meses no período`} />
            <StatTile label="Pacientes atendidos" value={formatNumber(stats.totalPatients)} detail="Soma de pacientes únicos por mês" />
            <StatTile
              label="Média mensal"
              value={formatNumber(stats.monthlyAverage)}
              detail={
                stats.variation === null
                  ? 'Sem mês anterior para comparar'
                  : `${stats.variation >= 0 ? '▲' : '▼'} ${Math.abs(stats.variation).toFixed(1).replace('.', ',')}% no último mês`
              }
            />
            <StatTile
              label="Condição mais frequente"
              value={stats.topCondition?.name ?? '—'}
              detail={stats.topCondition ? `${formatNumber(stats.topCondition.value)} casos` : undefined}
            />
          </dl>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Atendimentos por região"
              description={region ? `Comparativo do período, com ${region} em destaque.` : 'Total de atendimentos no período.'}
            >
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.regionData} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={6}>
                    <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                    <XAxis type="number" tick={AXIS_TEXT} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TEXT} width={130} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={0} maxBarSize={22}>
                      {stats.regionData.map((entry) => (
                        <Cell key={entry.name} fill={!region || entry.name === region ? CHART_COLOR : MUTED_COLOR} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable caption="Atendimentos por região" headers={['Região', 'Atendimentos']} rows={stats.regionData.map((d) => [d.name, d.value])} />
            </ChartCard>

            <ChartCard title="Condições mais frequentes" description={`Casos registrados — ${scopeLabel}.`}>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.conditionData} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={6}>
                    <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                    <XAxis type="number" tick={AXIS_TEXT} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={AXIS_TEXT} width={150} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(value) => [formatNumber(Number(value)), 'Casos']} />
                    <Bar dataKey="value" fill={CHART_COLOR} radius={0} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DataTable caption="Condições mais frequentes" headers={['Condição', 'Casos']} rows={stats.conditionData.map((d) => [d.name, d.value])} />
            </ChartCard>

            <div className="lg:col-span-2">
              <ChartCard title="Evolução mensal de atendimentos" description={`Total por mês — ${scopeLabel}.`}>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.monthData} margin={{ left: 8, right: 16, top: 8 }}>
                      <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                      <XAxis dataKey="label" tick={AXIS_TEXT} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                      <YAxis tick={AXIS_TEXT} tickFormatter={(v) => formatNumber(v)} axisLine={false} tickLine={false} width={64} />
                      <Tooltip {...tooltipStyle} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
                      <Line
                        type="linear"
                        dataKey="value"
                        stroke={CHART_COLOR}
                        strokeWidth={2}
                        dot={{ r: 3, fill: CHART_COLOR, strokeWidth: 0 }}
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <DataTable caption="Evolução mensal de atendimentos" headers={['Mês', 'Atendimentos']} rows={stats.monthData.map((d) => [d.label, d.value])} />
              </ChartCard>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
