import { PageHeader } from '../../components/layout/DashboardLayout'
import { AppointmentList } from '../../components/medico/AppointmentList'
import { Alert } from '../../components/ui/Alert'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Loading } from '../../components/ui/Spinner'
import { useCurrentUser } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { getAppointmentsByDoctor } from '../../services/api'

export default function MeuRegistro() {
  const user = useCurrentUser()
  const { data: appointments, loading, error } = useApi(() => getAppointmentsByDoctor(user.id), [user.id])

  const upcoming = appointments?.filter((a) => a.status === 'agendado') ?? []
  const done = appointments?.filter((a) => a.status === 'realizado') ?? []
  const patientsCount = new Set(appointments?.map((a) => a.patientCpf)).size

  // Saudação pelo horário e pelo primeiro nome, sem o "Dr."/"Dra."
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const firstName = user.name.replace(/^Dra?\.?\s+/i, '').split(' ')[0]
  const agenda = loading
    ? 'Carregando sua agenda...'
    : upcoming.length === 0
      ? 'Nenhum atendimento marcado por enquanto.'
      : `Você tem ${upcoming.length} ${upcoming.length === 1 ? 'atendimento marcado' : 'atendimentos marcados'}.`

  const profile = [
    { label: 'Nome', value: user.name },
    { label: 'E-mail', value: user.email },
    { label: 'Registro profissional', value: user.crm },
    { label: 'Especialidade', value: user.specialty },
    { label: 'Unidade', value: user.institution },
    { label: 'Telefone', value: user.phone },
  ]

  return (
    <>
      <PageHeader
        title="Meu registro"
        description={`${greeting}, ${firstName}. ${agenda}`}
        actions={
          <ButtonLink to="/medico/buscar">
            <Icon name="search" /> Buscar paciente
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Dados profissionais" icon={<Icon name="stethoscope" className="h-5 w-5 text-brand-700" />} className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            {profile.map((item) => (
              <div key={item.label}>
                <dt className="text-sm text-slate-500">{item.label}</dt>
                <dd className="text-slate-900">{item.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Resumo" icon={<Icon name="activity" className="h-5 w-5 text-brand-700" />}>
          {loading ? (
            <Loading />
          ) : (
            <dl className="divide-y divide-slate-100">
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <dt className="text-slate-600">Próximos atendimentos</dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">{upcoming.length}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <dt className="text-slate-600">Atendimentos realizados</dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">{done.length}</dd>
              </div>
              <div className="flex items-center justify-between py-2.5 first:pt-0">
                <dt className="text-slate-600">Pacientes atendidos</dt>
                <dd className="text-xl font-semibold tabular-nums text-slate-900">{patientsCount}</dd>
              </div>
            </dl>
          )}
        </Card>
      </div>

      <Card
        title="Próximos atendimentos"
        icon={<Icon name="calendar" className="h-5 w-5 text-brand-700" />}
        className="mt-6"
        actions={
          <ButtonLink to="/medico/proximos" variant="ghost" size="sm">
            Ver todos
          </ButtonLink>
        }
      >
        {error && <Alert tone="error">{error}</Alert>}
        {loading ? <Loading /> : <AppointmentList appointments={upcoming.slice(0, 3)} emptyMessage="Nenhum atendimento agendado." />}
      </Card>
    </>
  )
}
