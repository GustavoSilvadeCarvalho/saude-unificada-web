import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/layout/DashboardLayout'
import { Alert } from '../../components/ui/Alert'
import { Button, ButtonLink } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input, Select } from '../../components/ui/Input'
import { useApi } from '../../hooks/useApi'
import { createPatient, getRegions } from '../../services/api'
import type { BloodType, CreatePatientInput } from '../../types'
import { isValidCpf, maskCpf } from '../../utils/cpf'
import { todayIso } from '../../utils/format'

const BLOOD_TYPES: BloodType[] = ['Não informado', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

type FormErrors = Partial<Record<keyof CreatePatientInput, string>>

function validate(form: CreatePatientInput): FormErrors {
  const errors: FormErrors = {}
  if (!isValidCpf(form.cpf)) errors.cpf = 'Informe um CPF válido.'
  if (form.fullName.trim().split(/\s+/).length < 2) errors.fullName = 'Informe nome e sobrenome.'
  if (!form.birthDate) errors.birthDate = 'Informe a data de nascimento.'
  else if (form.birthDate > todayIso()) errors.birthDate = 'A data não pode estar no futuro.'
  if (!form.region) errors.region = 'Selecione a região.'
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'E-mail inválido.'
  return errors
}

export default function CadastrarPaciente() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { data: regions } = useApi(getRegions, [])
  const [form, setForm] = useState<CreatePatientInput>({
    cpf: maskCpf(params.get('cpf') ?? ''),
    fullName: '',
    birthDate: '',
    sex: 'F',
    bloodType: 'Não informado',
    phone: '',
    email: '',
    region: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)

  function update<K extends keyof CreatePatientInput>(field: K, value: CreatePatientInput[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validate(form)
    setErrors(found)
    setSubmitError('')
    if (Object.keys(found).length > 0) return

    setSaving(true)
    try {
      const patient = await createPatient({ ...form, fullName: form.fullName.trim() })
      navigate(`/medico/paciente/${patient.cpf}`, { state: { message: 'Paciente cadastrado com sucesso.' } })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao cadastrar paciente.')
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader title="Cadastrar paciente" description="Crie o prontuário unificado de um novo paciente." />
      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {submitError && <Alert tone="error">{submitError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="CPF"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => update('cpf', maskCpf(e.target.value))}
              error={errors.cpf}
              required
            />
            <Input
              label="Data de nascimento"
              type="date"
              max={todayIso()}
              value={form.birthDate}
              onChange={(e) => update('birthDate', e.target.value)}
              error={errors.birthDate}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Nome completo"
                autoComplete="off"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                error={errors.fullName}
                required
              />
            </div>
            <Select
              label="Sexo"
              value={form.sex}
              onChange={(e) => update('sex', e.target.value as CreatePatientInput['sex'])}
              options={[
                { value: 'F', label: 'Feminino' },
                { value: 'M', label: 'Masculino' },
                { value: 'Outro', label: 'Outro' },
              ]}
            />
            <Select
              label="Tipo sanguíneo"
              value={form.bloodType}
              onChange={(e) => update('bloodType', e.target.value as BloodType)}
              options={BLOOD_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Select
              label="Região de saúde"
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              error={errors.region}
              required
              options={[{ value: '', label: 'Selecione...' }, ...(regions ?? []).map((r) => ({ value: r, label: r }))]}
            />
            <Input
              label="Telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                error={errors.email}
              />
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <ButtonLink to="/medico/buscar" variant="ghost">
              Cancelar
            </ButtonLink>
            <Button type="submit" loading={saving}>
              Cadastrar paciente
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
