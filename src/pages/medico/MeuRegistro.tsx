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
        description="Seus dados profissionais e um resumo da sua agenda."
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
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-0.5 text-sm text-slate-900">{item.value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Resumo" icon={<Icon name="activity" className="h-5 w-5 text-brand-700" />}>
          {loading ? (
            <Loading />
          ) : (
            <dl className="space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600">Próximos atendimentos</dt>
                <dd className="text-2xl font-bold text-brand-700">{upcoming.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600">Atendimentos realizados</dt>
                <dd className="text-2xl font-bold text-mint-700">{done.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-slate-600">Pacientes atendidos</dt>
                <dd className="text-2xl font-bold text-slate-800">{patientsCount}</dd>
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
