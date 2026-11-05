import { useLocation, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Loading } from '../../components/ui/Spinner'
import { useApi } from '../../hooks/useApi'
import { getAppointmentsByPatient, getPatientByCpf } from '../../services/api'
import type { AllergySeverity, ConditionStatus } from '../../types'
import { maskCpf } from '../../utils/cpf'
import { calculateAge, formatDate, formatDateTime } from '../../utils/format'

const SEVERITY_TONE: Record<AllergySeverity, 'danger' | 'warning' | 'neutral'> = {
  grave: 'danger',
  moderada: 'warning',
  leve: 'neutral',
}

const CONDITION_TONE: Record<ConditionStatus, 'danger' | 'success' | 'neutral'> = {
  ativa: 'danger',
  controlada: 'success',
  resolvida: 'neutral',
}

const SEX_LABEL = { F: 'Feminino', M: 'Masculino', Outro: 'Outro' }

function EmptyText({ children }: { children: string }) {
  return <p className="text-sm text-slate-500">{children}</p>
}

export default function Prontuario() {
  const { cpf = '' } = useParams()
  const location = useLocation()
  const successMessage = (location.state as { message?: string } | null)?.message

  const { data, loading, error } = useApi(
    () => Promise.all([getPatientByCpf(cpf), getAppointmentsByPatient(cpf)]),
    [cpf],
  )

  if (loading) return <Loading label="Carregando prontuário..." />
  if (error) return <Alert tone="error">{error}</Alert>

  const [patient, appointments] = data ?? [null, []]
  if (!patient) {
    return (
      <Card className="max-w-xl">
        <h1 className="text-lg font-semibold">Paciente não encontrado</h1>
        <p className="mt-1 text-sm text-slate-600">Não há prontuário para o CPF {maskCpf(cpf)}.</p>
        <div className="mt-4 flex gap-3">
          <ButtonLink to={`/medico/paciente/novo?cpf=${cpf}`} variant="secondary">
            Cadastrar paciente
          </ButtonLink>
          <ButtonLink to="/medico/buscar" variant="ghost">
            Nova busca
          </ButtonLink>
        </div>
      </Card>
    )
  }

  const upcoming = appointments.filter((a) => a.status === 'agendado')
  const documents = appointments.flatMap((a) => a.documents.map((d) => ({ ...d, appointmentDate: a.date })))
  const hasSevereAllergy = patient.allergies.some((a) => a.severity === 'grave')

  return (
    <>
      <PageHeader
        title="Prontuário unificado"
        actions={
          <ButtonLink to={`/medico/paciente/${patient.cpf}/atendimento`} variant="secondary">
            <Icon name="plus" /> Registrar atendimento
          </ButtonLink>
        }
      />

      {successMessage && (
        <div className="mb-6">
          <Alert tone="success">{successMessage}</Alert>
        </div>
      )}

      {/* Identificação + tipo sanguíneo em destaque */}
      <Card as="div" className="mb-6">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-800" aria-hidden="true">
            {patient.fullName
              .split(' ')
              .filter((_, i, arr) => i === 0 || i === arr.length - 1)
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900">{patient.fullName}</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              CPF {maskCpf(patient.cpf)} · {calculateAge(patient.birthDate)} anos ({formatDate(patient.birthDate)}) · {SEX_LABEL[patient.sex]}
            </p>
            <p className="text-sm text-slate-600">
              {patient.region}
              {patient.phone && ` · ${patient.phone}`}
              {patient.email && ` · ${patient.email}`}
            </p>
          </div>
          <div className="rounded-xl border-2 border-red-600 bg-red-50 px-5 py-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Tipo sanguíneo</p>
            <p className="text-3xl font-extrabold text-red-700">{patient.bloodType}</p>
          </div>
        </div>
      </Card>

      {/* Alergias em destaque */}
      <section
        aria-labelledby="alergias-title"
        className={`mb-6 rounded-xl border-2 p-5 ${
          patient.allergies.length > 0 ? 'border-red-500 bg-red-50' : 'border-mint-500/50 bg-mint-50'
        }`}
      >
        <h2 id="alergias-title" className={`flex items-center gap-2 font-bold ${patient.allergies.length > 0 ? 'text-red-800' : 'text-mint-700'}`}>
          <Icon name="alert" />
          {patient.allergies.length > 0
            ? `Alergias (${patient.allergies.length})${hasSevereAllergy ? ' — ATENÇÃO: alergia grave' : ''}`
            : 'Nenhuma alergia registrada'}
        </h2>
        {patient.allergies.length > 0 && (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {patient.allergies.map((a) => (
              <li key={a.id} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{a.substance}</span>
                  <Badge tone={SEVERITY_TONE[a.severity]}>{a.severity}</Badge>
                </div>
                {a.reaction && <p className="mt-1 text-sm text-slate-600">{a.reaction}</p>}
                <p className="mt-1 text-xs text-slate-500">Registrada em {formatDate(a.recordedAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Condições clínicas" icon={<Icon name="activity" className="h-5 w-5 text-brand-700" />}>
          {patient.clinicalConditions.length === 0 ? (
            <EmptyText>Nenhuma condição registrada.</EmptyText>
          ) : (
            <ul className="space-y-3">
              {patient.clinicalConditions.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {c.name} {c.cid && <span className="text-xs text-slate-500">(CID {c.cid})</span>}
                    </p>
                    <p className="text-xs text-slate-500">Desde {formatDate(c.diagnosedAt)}</p>
                  </div>
                  <Badge tone={CONDITION_TONE[c.status]}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Medicamentos ativos" icon={<Icon name="pill" className="h-5 w-5 text-brand-700" />}>
          {patient.activeMedications.length === 0 ? (
            <EmptyText>Nenhum medicamento em uso.</EmptyText>
          ) : (
            <ul className="space-y-3">
              {patient.activeMedications.map((m) => (
                <li key={m.id}>
                  <p className="font-medium text-slate-900">
                    {m.name} <span className="font-normal text-slate-600">— {m.dosage}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {m.frequency} · desde {formatDate(m.startDate)}
                    {m.prescribedBy && ` · ${m.prescribedBy}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Exames e laudos" icon={<Icon name="file" className="h-5 w-5 text-brand-700" />}>
          {patient.exams.length === 0 ? (
            <EmptyText>Nenhum exame registrado.</EmptyText>
          ) : (
            <ul className="space-y-3">
              {[...patient.exams]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <li key={e.id}>
                    <p className="font-medium text-slate-900">{e.name}</p>
                    <p className="text-sm text-slate-600">{e.result}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.date)}
                      {e.fileName && ` · ${e.fileName}`}
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card title="Procedimentos" icon={<Icon name="clipboard" className="h-5 w-5 text-brand-700" />}>
          {patient.procedures.length === 0 ? (
            <EmptyText>Nenhum procedimento registrado.</EmptyText>
          ) : (
            <ul className="space-y-3">
              {patient.procedures.map((p) => (
                <li key={p.id}>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(p.date)}
                    {p.location && ` · ${p.location}`}
                  </p>
                  {p.notes && <p className="text-sm text-slate-600">{p.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Resumo de atendimentos" icon={<Icon name="history" className="h-5 w-5 text-brand-700" />} className="lg:col-span-2">
          {upcoming.length > 0 && (
            <div className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
              <strong>Agendado:</strong>{' '}
              {upcoming.map((a) => `${formatDateTime(a.date)} com ${a.doctorName}`).join('; ')}
            </div>
          )}
          {patient.appointmentSummaries.length === 0 ? (
            <EmptyText>Nenhum atendimento realizado ainda.</EmptyText>
          ) : (
            <ol className="relative space-y-5 border-l-2 border-slate-200 pl-5">
              {patient.appointmentSummaries.map((s) => (
                <li key={s.appointmentId} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full bg-mint-600" aria-hidden="true" />
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDateTime(s.date)} — {s.doctorName}
                    {s.specialty && <span className="font-normal text-slate-500"> ({s.specialty})</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-700">{s.summary}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Documentos anexados" icon={<Icon name="upload" className="h-5 w-5 text-brand-700" />} className="lg:col-span-2">
          {documents.length === 0 ? (
            <EmptyText>Nenhum documento anexado.</EmptyText>
          ) : (
            <ul className="divide-y divide-slate-100">
              {documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Icon name="file" className="h-4 w-4 text-slate-500" />
                    {d.fileName}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-slate-500">
                    <Badge tone="brand">{d.type}</Badge>
                    enviado em {formatDateTime(d.uploadedAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
