import { PageHeader } from '../../components/layout/DashboardLayout'
import { AppointmentList } from '../../components/medico/AppointmentList'
import { Alert } from '../../components/ui/Alert'
import { Card } from '../../components/ui/Card'
import { Loading } from '../../components/ui/Spinner'
import { useCurrentUser } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { getAppointmentsByDoctor } from '../../services/api'
import type { AppointmentStatus } from '../../types'

const CONTENT: Record<AppointmentStatus, { title: string; description: string; empty: string }> = {
  agendado: {
    title: 'Próximos atendimentos',
    description: 'Atendimentos agendados, do mais próximo ao mais distante.',
    empty: 'Nenhum atendimento agendado.',
  },
  realizado: {
    title: 'Atendimentos passados',
    description: 'Histórico dos atendimentos que você realizou, do mais recente ao mais antigo.',
    empty: 'Você ainda não registrou atendimentos.',
  },
}

export default function Atendimentos({ status }: { status: AppointmentStatus }) {
  const user = useCurrentUser()
  const { data, loading, error } = useApi(() => getAppointmentsByDoctor(user.id), [user.id])
  const content = CONTENT[status]

  const list = (data ?? []).filter((a) => a.status === status)
  if (status === 'realizado') list.reverse()

  return (
    <>
      <PageHeader title={content.title} description={content.description} />
      <Card>
        {error && <Alert tone="error">{error}</Alert>}
        {loading ? <Loading /> : <AppointmentList appointments={list} emptyMessage={content.empty} />}
      </Card>
    </>
  )
}
