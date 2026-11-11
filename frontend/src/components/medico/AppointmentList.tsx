import { Link } from 'react-router-dom'
import type { Appointment } from '../../types'
import { maskCpf } from '../../utils/cpf'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'

interface AppointmentListProps {
  appointments: Appointment[]
  emptyMessage: string
}

const dayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

/** Lista de atendimentos no formato de agenda, com link para o prontuário do paciente */
export function AppointmentList({ appointments, emptyMessage }: AppointmentListProps) {
  if (appointments.length === 0) {
    return <p className="py-4 text-slate-500">{emptyMessage}</p>
  }

  return (
    <ul className="divide-y divide-slate-200">
      {appointments.map((a) => {
        const date = new Date(a.date)
        return (
          <li key={a.id} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[6.5rem_1fr_auto] sm:items-start">
            <time dateTime={a.date} className="leading-tight">
              <span className="block font-semibold tabular-nums text-slate-900">{timeFormat.format(date)}</span>
              <span className="block text-sm capitalize text-slate-500">{dayFormat.format(date).replace('.', '')}</span>
            </time>
            <div className="min-w-0">
              <Link to={`/medico/paciente/${a.patientCpf}`} className="font-semibold text-brand-700 underline-offset-2 hover:underline">
                {a.patientName}
              </Link>
              <span className="ml-2 text-sm text-slate-500">CPF {maskCpf(a.patientCpf)}</span>
              {a.reason && <p className="mt-0.5 text-slate-700">{a.reason}</p>}
              {a.summary && <p className="mt-0.5 text-slate-600">{a.summary}</p>}
              {a.documents.length > 0 && (
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                  <Icon name="file" className="h-4 w-4" />
                  {a.documents.map((d) => d.fileName).join(', ')}
                </p>
              )}
            </div>
            {a.status === 'agendado' && (
              <ButtonLink
                to={`/medico/paciente/${a.patientCpf}/atendimento?agendamento=${a.id}`}
                size="sm"
                variant="outline"
                className="justify-self-start"
              >
                Registrar atendimento
              </ButtonLink>
            )}
          </li>
        )
      })}
    </ul>
  )
}
