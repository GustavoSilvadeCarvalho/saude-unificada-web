import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Alert } from '../../components/ui/Alert'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { Input } from '../../components/ui/Input'
import { useCurrentUser } from '../../contexts/AuthContext'
import { useApi } from '../../hooks/useApi'
import { MOCK_CPFS, mockPatients } from '../../mocks/patients'
import { USE_MOCK, getAppointmentsByDoctor, getPatientByCpf } from '../../services/api'
import { formatDate } from '../../utils/format'
import { isValidCpf, maskCpf, onlyDigits } from '../../utils/cpf'

export default function BuscarPaciente() {
  const navigate = useNavigate()
  const [cpf, setCpf] = useState('')
  const [error, setError] = useState('')
  const [notFoundCpf, setNotFoundCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const user = useCurrentUser()
  const { data: appointments } = useApi(() => getAppointmentsByDoctor(user.id), [user.id])

  // Pacientes que já passaram por este médico, do atendimento mais recente para o mais antigo
  const recentPatients = Array.from(
    [...(appointments ?? [])]
      .filter((a) => a.status === 'realizado')
      .sort((a, b) => b.date.localeCompare(a.date))
      .reduce((map, a) => (map.has(a.patientCpf) ? map : map.set(a.patientCpf, a)), new Map<string, NonNullable<typeof appointments>[number]>())
      .values(),
  ).slice(0, 6)

  async function search(value: string) {
    setError('')
    setNotFoundCpf('')
    if (onlyDigits(value).length !== 11) {
      setError('Digite os 11 dígitos do CPF.')
      return
    }
    if (!isValidCpf(value)) {
      setError('CPF inválido. Confira os números digitados.')
      return
    }
    setLoading(true)
    try {
      const patient = await getPatientByCpf(value)
      if (patient) {
        navigate(`/medico/paciente/${patient.cpf}`)
        return
      }
      setNotFoundCpf(onlyDigits(value))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar paciente.')
    }
    setLoading(false)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    search(cpf)
  }

  return (
    <>
      <PageHeader title="Buscar paciente" description="Encontre o prontuário unificado pelo CPF do paciente." />

      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1">
            <Input
              label="CPF do paciente"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(maskCpf(e.target.value))}
              error={error}
              required
            />
          </div>
          <Button type="submit" loading={loading} className="sm:mt-[1.85rem]">
            <Icon name="search" /> Buscar
          </Button>
        </form>

        {notFoundCpf && (
          <div className="mt-4">
            <Alert tone="warning">
              <p className="font-semibold">Nenhum paciente encontrado com o CPF {maskCpf(notFoundCpf)}.</p>
              <p className="mt-1">Confira o número ou cadastre o paciente para iniciar o prontuário.</p>
              <ButtonLink to={`/medico/paciente/novo?cpf=${notFoundCpf}`} size="sm" className="mt-3">
                <Icon name="plus" /> Cadastrar paciente
              </ButtonLink>
            </Alert>
          </div>
        )}
      </Card>

      {recentPatients.length > 0 && (
        <section aria-labelledby="recentes-title" className="mt-8 max-w-2xl">
          <h2 id="recentes-title" className="font-semibold text-slate-900">
            Atendidos por você recentemente
          </h2>
          <ul className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
            {recentPatients.map((a) => (
              <li key={a.patientCpf}>
                <Link
                  to={`/medico/paciente/${a.patientCpf}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 px-1 py-2.5 hover:bg-white"
                >
                  <span className="font-medium text-brand-700">{a.patientName}</span>
                  <span className="text-sm text-slate-500">
                    CPF {maskCpf(a.patientCpf)} · última consulta em {formatDate(a.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {USE_MOCK && (
        <Card title="CPFs de teste" className="mt-6 max-w-2xl">
          <p className="mb-3 text-sm text-slate-600">
            Clique para buscar. Para testar o cadastro, use um CPF válido que não esteja na lista, como 111.444.777-35.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.values(MOCK_CPFS).map((value) => {
              const name = mockPatients.find((p) => p.cpf === value)?.fullName
              return (
                <li key={value}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-500 hover:bg-brand-50"
                    onClick={() => {
                      setCpf(maskCpf(value))
                      search(value)
                    }}
                  >
                    <span className="block font-medium text-slate-900">{name}</span>
                    <span className="text-slate-500">{maskCpf(value)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </>
  )
}
