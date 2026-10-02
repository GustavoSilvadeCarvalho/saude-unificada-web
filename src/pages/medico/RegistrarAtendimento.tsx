import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Alert } from '../../components/ui/Alert'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Loading } from '../../components/ui/Spinner'
import { useCurrentUser } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { createAppointment, getAppointmentsByPatient, getPatientByCpf } from '../../services/api'
import type {
  AllergySeverity,
  AppointmentStatus,
  ConditionStatus,
  CreateAppointmentInput,
  DocumentType,
  DocumentUpload,
} from '../../types'
import { maskCpf } from '../../utils/cpf'
import { formatDateTime, todayIso } from '../../utils/format'

/** Converte Date para o formato aceito por <input type="datetime-local"> */
function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

interface AllergyDraft {
  substance: string
  severity: AllergySeverity
  reaction: string
}
interface MedicationDraft {
  name: string
  dosage: string
  frequency: string
}
interface ConditionDraft {
  name: string
  cid: string
  status: ConditionStatus
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'laudo', label: 'Laudo' },
  { value: 'exame', label: 'Resultado de exame' },
  { value: 'outro', label: 'Outro' },
]

/** Bloco de itens dinâmicos (alergias, medicamentos, condições) */
function DynamicSection({ title, addLabel, onAdd, children, count }: { title: string; addLabel: string; onAdd: () => void; children: ReactNode; count: number }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>
      {count === 0 && <p className="mb-3 text-sm text-slate-500">Nenhum item adicionado.</p>}
      <div className="space-y-3">{children}</div>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onAdd}>
        <Icon name="plus" className="h-4 w-4" /> {addLabel}
      </Button>
    </fieldset>
  )
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="self-end rounded-lg p-2.5 text-slate-500 hover:bg-red-50 hover:text-red-700">
      <Icon name="close" />
    </button>
  )
}

export default function RegistrarAtendimento() {
  const { cpf = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const user = useCurrentUser()

  const { data, loading, error } = useApi(() => Promise.all([getPatientByCpf(cpf), getAppointmentsByPatient(cpf)]), [cpf])
  const [patient, patientAppointments] = data ?? [null, []]
  const scheduled = patientAppointments.filter((a) => a.status === 'agendado' && a.doctorId === user.id)

  const [scheduledId, setScheduledId] = useState(params.get('agendamento') ?? '')
  const [date, setDate] = useState(toLocalInput(new Date()))
  const [status, setStatus] = useState<AppointmentStatus>('realizado')
  const [reason, setReason] = useState('')
  const [summary, setSummary] = useState('')
  const [allergies, setAllergies] = useState<AllergyDraft[]>([])
  const [medications, setMedications] = useState<MedicationDraft[]>([])
  const [conditions, setConditions] = useState<ConditionDraft[]>([])
  const [uploads, setUploads] = useState<DocumentUpload[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  // Ao vincular um agendamento, preenche o motivo com o do agendamento
  const selectedScheduled = scheduled.find((a) => a.id === scheduledId)
  useEffect(() => {
    if (selectedScheduled?.reason) setReason((current) => current || selectedScheduled.reason!)
  }, [selectedScheduled])

  if (loading) return <Loading label="Carregando paciente..." />
  if (error) return <Alert tone="error">{error}</Alert>
  if (!patient) return <Alert tone="error">Paciente não encontrado.</Alert>

  const isDone = status === 'realizado'

  function validate(): Record<string, string> {
    const found: Record<string, string> = {}
    if (!date) found.date = 'Informe a data e hora.'
    else if (isDone && new Date(date) > new Date()) found.date = 'Um atendimento realizado não pode ter data futura.'
    else if (!isDone && new Date(date) < new Date()) found.date = 'Um agendamento precisa ter data futura.'
    if (isDone && summary.trim().length < 10) found.summary = 'Descreva o atendimento (mínimo de 10 caracteres).'
    if (allergies.some((a) => !a.substance.trim())) found.allergies = 'Preencha a substância de todas as alergias ou remova as vazias.'
    if (medications.some((m) => !m.name.trim() || !m.dosage.trim())) found.medications = 'Preencha nome e dosagem dos medicamentos ou remova os vazios.'
    if (conditions.some((c) => !c.name.trim())) found.conditions = 'Preencha o nome das condições ou remova as vazias.'
    return found
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setSubmitError('')
    if (Object.keys(found).length > 0) return

    const today = todayIso()
    const input: CreateAppointmentInput = {
      scheduledAppointmentId: scheduledId || undefined,
      patientCpf: patient!.cpf,
      doctorId: user.id,
      date: new Date(date).toISOString(),
      status,
      reason: reason.trim() || undefined,
      summary: summary.trim(),
      // Atualizações do prontuário só fazem sentido em atendimentos realizados
      newAllergies: isDone
        ? allergies.map((a) => ({ substance: a.substance.trim(), severity: a.severity, reaction: a.reaction.trim() || undefined, recordedAt: today }))
        : [],
      newMedications: isDone
        ? medications.map((m) => ({ name: m.name.trim(), dosage: m.dosage.trim(), frequency: m.frequency.trim(), startDate: today, prescribedBy: user.name }))
        : [],
      newConditions: isDone
        ? conditions.map((c) => ({ name: c.name.trim(), cid: c.cid.trim() || undefined, status: c.status, diagnosedAt: today }))
        : [],
    }

    setSaving(true)
    try {
      await createAppointment(input, isDone ? uploads : [])
      navigate(`/medico/paciente/${patient!.cpf}`, {
        state: { message: isDone ? 'Atendimento registrado e prontuário atualizado.' : 'Atendimento agendado com sucesso.' },
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao salvar o atendimento.')
      setSaving(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    setUploads((current) => [...current, ...Array.from(files).map((file) => ({ file, type: 'receita' as DocumentType }))])
  }

  return (
    <>
      <PageHeader
        title="Registrar atendimento"
        description={`${patient.fullName} · CPF ${maskCpf(patient.cpf)}`}
        actions={
          <Link to={`/medico/paciente/${patient.cpf}`} className="text-sm font-medium text-brand-700 hover:underline">
            ← Voltar ao prontuário
          </Link>
        }
      />

      {patient.allergies.length > 0 && (
        <div className="mb-6">
          <Alert tone="error">
            <strong>Alergias do paciente:</strong> {patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {submitError && <Alert tone="error">{submitError}</Alert>}

        <Card title="Dados do atendimento">
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduled.length > 0 && (
              <div className="sm:col-span-2">
                <Select
                  label="Vincular a um agendamento"
                  value={scheduledId}
                  onChange={(e) => setScheduledId(e.target.value)}
                  hint="Ao vincular, o agendamento passa a constar como realizado."
                  options={[
                    { value: '', label: 'Não vincular (novo atendimento)' },
                    ...scheduled.map((a) => ({ value: a.id, label: `${formatDateTime(a.date)} — ${a.reason ?? 'Consulta'}` })),
                  ]}
                />
              </div>
            )}
            <Select
              label="Situação"
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              options={[
                { value: 'realizado', label: 'Realizado' },
                { value: 'agendado', label: 'Agendar para depois' },
              ]}
            />
            <Input label="Data e hora" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
            <div className="sm:col-span-2">
              <Input label="Motivo da consulta" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: dor de cabeça há 3 dias" />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Resumo do atendimento"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                error={errors.summary}
                placeholder="Anamnese, exame físico, conduta e orientações."
                required={isDone}
              />
            </div>
          </div>
        </Card>

        {isDone && (
          <>
            <Card title="Atualizar prontuário">
              <div className="space-y-5">
                <DynamicSection
                  title="Novas alergias"
                  addLabel="Adicionar alergia"
                  count={allergies.length}
                  onAdd={() => setAllergies((l) => [...l, { substance: '', severity: 'moderada', reaction: '' }])}
                >
                  {errors.allergies && <Alert tone="error">{errors.allergies}</Alert>}
                  {allergies.map((a, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
                      <Input label="Substância" value={a.substance} onChange={(e) => setAllergies((l) => l.map((x, j) => (j === i ? { ...x, substance: e.target.value } : x)))} />
                      <Select
                        label="Gravidade"
                        value={a.severity}
                        onChange={(e) => setAllergies((l) => l.map((x, j) => (j === i ? { ...x, severity: e.target.value as AllergySeverity } : x)))}
                        options={[
                          { value: 'leve', label: 'Leve' },
                          { value: 'moderada', label: 'Moderada' },
                          { value: 'grave', label: 'Grave' },
                        ]}
                      />
                      <Input label="Reação" value={a.reaction} onChange={(e) => setAllergies((l) => l.map((x, j) => (j === i ? { ...x, reaction: e.target.value } : x)))} />
                      <RemoveButton label={`Remover alergia ${i + 1}`} onClick={() => setAllergies((l) => l.filter((_, j) => j !== i))} />
                    </div>
                  ))}
                </DynamicSection>

                <DynamicSection
                  title="Novos medicamentos"
                  addLabel="Adicionar medicamento"
                  count={medications.length}
                  onAdd={() => setMedications((l) => [...l, { name: '', dosage: '', frequency: '' }])}
                >
                  {errors.medications && <Alert tone="error">{errors.medications}</Alert>}
                  {medications.map((m, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto]">
                      <Input label="Medicamento" value={m.name} onChange={(e) => setMedications((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input label="Dosagem" value={m.dosage} placeholder="500 mg" onChange={(e) => setMedications((l) => l.map((x, j) => (j === i ? { ...x, dosage: e.target.value } : x)))} />
                      <Input label="Frequência" value={m.frequency} placeholder="8 em 8 horas" onChange={(e) => setMedications((l) => l.map((x, j) => (j === i ? { ...x, frequency: e.target.value } : x)))} />
                      <RemoveButton label={`Remover medicamento ${i + 1}`} onClick={() => setMedications((l) => l.filter((_, j) => j !== i))} />
                    </div>
                  ))}
                </DynamicSection>

                <DynamicSection
                  title="Novas condições clínicas"
                  addLabel="Adicionar condição"
                  count={conditions.length}
                  onAdd={() => setConditions((l) => [...l, { name: '', cid: '', status: 'ativa' }])}
                >
                  {errors.conditions && <Alert tone="error">{errors.conditions}</Alert>}
                  {conditions.map((c, i) => (
                    <div key={i} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
                      <Input label="Condição" value={c.name} onChange={(e) => setConditions((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                      <Input label="CID-10" value={c.cid} placeholder="J45" onChange={(e) => setConditions((l) => l.map((x, j) => (j === i ? { ...x, cid: e.target.value.toUpperCase() } : x)))} />
                      <Select
                        label="Situação"
                        value={c.status}
                        onChange={(e) => setConditions((l) => l.map((x, j) => (j === i ? { ...x, status: e.target.value as ConditionStatus } : x)))}
                        options={[
                          { value: 'ativa', label: 'Ativa' },
                          { value: 'controlada', label: 'Controlada' },
                          { value: 'resolvida', label: 'Resolvida' },
                        ]}
                      />
                      <RemoveButton label={`Remover condição ${i + 1}`} onClick={() => setConditions((l) => l.filter((_, j) => j !== i))} />
                    </div>
                  ))}
                </DynamicSection>
              </div>
            </Card>

            <Card title="Receitas e laudos">
              <label
                htmlFor="upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:border-brand-500 hover:bg-brand-50 focus-within:border-brand-500"
              >
                <Icon name="upload" className="h-8 w-8 text-brand-700" />
                <span className="text-sm font-medium text-slate-800">Clique para selecionar arquivos</span>
                <span className="text-xs text-slate-500">PDF, JPG ou PNG</span>
                <input
                  id="upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={(e) => {
                    handleFiles(e.target.files)
                    e.target.value = ''
                  }}
                />
              </label>
              {uploads.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {uploads.map((u, i) => (
                    <li key={`${u.file.name}-${i}`} className="grid items-end gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_200px_auto]">
                      <p className="flex items-center gap-2 self-center truncate text-sm font-medium text-slate-800">
                        <Icon name="file" className="h-4 w-4 shrink-0" /> {u.file.name}
                      </p>
                      <Select
                        label="Tipo"
                        value={u.type}
                        onChange={(e) => setUploads((l) => l.map((x, j) => (j === i ? { ...x, type: e.target.value as DocumentType } : x)))}
                        options={DOCUMENT_TYPES}
                      />
                      <RemoveButton label={`Remover arquivo ${u.file.name}`} onClick={() => setUploads((l) => l.filter((_, j) => j !== i))} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <ButtonLink to={`/medico/paciente/${patient.cpf}`} variant="ghost">
            Cancelar
          </ButtonLink>
          <Button type="submit" variant="secondary" size="lg" loading={saving}>
            {isDone ? 'Salvar atendimento' : 'Agendar atendimento'}
          </Button>
        </div>
      </form>
    </>
  )
}
