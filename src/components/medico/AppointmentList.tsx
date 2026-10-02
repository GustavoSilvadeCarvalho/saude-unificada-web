import { Link } from 'react-router-dom'
import type { Appointment } from '../../types'
import { maskCpf } from '../../utils/cpf'
import { formatDateTime } from '../../utils/format'
import { Badge } from '../ui/Badge'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface AppointmentListProps {
  appointments: Appointment[]
  emptyMessage: string
}

/** Lista de atendimentos com link para o prontuário do paciente */
export function AppointmentList({ appointments, emptyMessage }: AppointmentListProps) {
  if (appointments.length === 0) {
    return <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
  }

  return (
    <ul className="divide-y divide-slate-100">
      {appointments.map((a) => (
        <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/medico/paciente/${a.patientCpf}`}
                className="font-semibold text-brand-700 underline-offset-2 hover:underline"
              >
                {a.patientName}
              </Link>
              <Badge tone={a.status === 'agendado' ? 'brand' : 'success'}>
                {a.status === 'agendado' ? 'Agendado' : 'Realizado'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              <time dateTime={a.date}>{formatDateTime(a.date)}</time> · CPF {maskCpf(a.patientCpf)}
            </p>
            {a.reason && <p className="mt-1 text-sm text-slate-700">{a.reason}</p>}
            {a.summary && <p className="mt-1 text-sm text-slate-600">{a.summary}</p>}
            {a.documents.length > 0 && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Icon name="file" className="h-4 w-4" />
                {a.documents.map((d) => d.fileName).join(', ')}
              </p>
            )}
          </div>
          {a.status === 'agendado' && (
            <ButtonLink
              to={`/medico/paciente/${a.patientCpf}/atendimento?agendamento=${a.id}`}
              size="sm"
              variant="secondary"
              className="shrink-0"
            >
              Registrar atendimento
            </ButtonLink>
          )}
        </li>
      ))}
    </ul>
  )
}
