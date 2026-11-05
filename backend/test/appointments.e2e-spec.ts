import { SEED_CPFS } from '../src/database/seed-data.js'
import { createTestApp, type TestContext } from './helpers.js'

const DAY = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()
const today = () => new Date().toISOString().slice(0, 10)

// CPF fictício válido que não está cadastrado
const UNKNOWN_CPF = '12500605752'

type Appointment = {
  id: string
  patientCpf: string
  doctorId: string
  date: string
  status: 'realizado' | 'agendado'
  reason?: string
  summary: string
  documents: unknown[]
}

describe('Atendimentos', () => {
  let ctx: TestContext
  let rafael: { token: string; id: string }
  let camila: { token: string; id: string }
  let gestor: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

  async function agenda(doctor: { token: string; id: string }): Promise<Appointment[]> {
    const res = await ctx.api().get(`/api/appointments?doctorId=${doctor.id}`).set(auth(doctor.token))
    return res.body
  }

  async function scheduledOf(doctor: { token: string; id: string }, cpf: string) {
    const found = (await agenda(doctor)).find((a) => a.patientCpf === cpf && a.status === 'agendado')
    if (!found) throw new Error(`Sem agendamento para ${cpf}`)
    return found
  }

  /** Corpo válido de atendimento realizado; os testes sobrescrevem o que precisam */
  const done = (overrides: Record<string, unknown> = {}) => ({
    patientCpf: SEED_CPFS.joao,
    doctorId: rafael.id,
    date: inDays(-0.01),
    status: 'realizado',
    reason: 'Crise de asma',
    summary: 'Sibilância difusa, melhora após nebulização. Ajustada medicação de manutenção.',
    newAllergies: [],
    newMedications: [],
    newConditions: [],
    ...overrides,
  })

  const post = (token: string, body: object) => ctx.api().post('/api/appointments').set(auth(token)).send(body)

  beforeAll(async () => {
    ctx = await createTestApp()
    const r = await ctx.loginUser('medico@teste.com')
    const c = await ctx.loginUser('cardio@teste.com')
    rafael = { token: r.token, id: r.user.id }
    camila = { token: c.token, id: c.user.id }
    gestor = await ctx.login('gestor@teste.com')
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('GET /api/appointments?doctorId=', () => {
    it('devolve a agenda do médico (passados e próximos) em ordem crescente de data', async () => {
      const list = await agenda(rafael)

      expect(list).toHaveLength(8)
      expect(list.every((a) => a.doctorId === rafael.id)).toBe(true)
      expect(list.map((a) => a.date)).toEqual([...list.map((a) => a.date)].sort())
      expect(list.filter((a) => a.status === 'agendado')).toHaveLength(4)
      expect(list[0]).toMatchObject({ documents: [] })
      expect(list[0]).not.toHaveProperty('_id')
    })

    it('responde 403 na agenda de outro médico', async () => {
      const res = await ctx.api().get(`/api/appointments?doctorId=${camila.id}`).set(auth(rafael.token))

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Você só pode ver a sua própria agenda.')
    })
  })

  describe('GET /api/appointments?patientCpf=', () => {
    it('devolve o histórico do paciente com todos os médicos, do mais recente ao mais antigo', async () => {
      const res = await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.carlos}`).set(auth(rafael.token))

      expect(res.status).toBe(200)
      // Os 2 atendimentos do Carlos são com a Dra. Camila, e o Dr. Rafael também vê
      expect(res.body).toHaveLength(2)
      expect(res.body.every((a: Appointment) => a.doctorId === camila.id)).toBe(true)
      expect(res.body[0].date > res.body[1].date).toBe(true)
    })

    it('registra o acesso ao histórico na auditoria', async () => {
      await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.beatriz}`).set(auth(rafael.token)).expect(200)

      const logs = await ctx.connection.collection('audit_logs').find({ patientCpf: SEED_CPFS.beatriz }).toArray()
      expect(logs.map((l) => l.action)).toContain('appointments.view')
    })
  })

  describe('GET /api/appointments (filtros)', () => {
    it.each([
      ['', 'Informe doctorId ou patientCpf.'],
      [`?doctorId=x&patientCpf=${SEED_CPFS.maria}`, 'Médico inválido.'],
      ['?patientCpf=12345678900', 'CPF inválido.'],
      ['?doctorId=123', 'Médico inválido.'],
    ])('responde 400 com filtro %j', async (query, message) => {
      const res = await ctx.api().get(`/api/appointments${query}`).set(auth(rafael.token))

      expect(res.status).toBe(400)
      expect(res.body.message).toBe(message)
    })

    it('responde 400 com os dois filtros juntos', async () => {
      const res = await ctx
        .api()
        .get(`/api/appointments?doctorId=${rafael.id}&patientCpf=${SEED_CPFS.maria}`)
        .set(auth(rafael.token))

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Informe só um filtro: doctorId ou patientCpf.')
    })

    it('responde 403 para o gestor', async () => {
      const res = await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.maria}`).set(auth(gestor))

      expect(res.status).toBe(403)
    })
  })

  describe('POST /api/appointments', () => {
    it('registra um atendimento novo e atualiza o prontuário', async () => {
      const res = await post(
        rafael.token,
        done({
          newAllergies: [{ substance: 'Ibuprofeno', severity: 'moderada', reaction: 'Urticária', recordedAt: today() }],
          newMedications: [{ name: 'Prednisolona', dosage: '20 mg', frequency: '1x ao dia por 5 dias', startDate: today() }],
          newConditions: [{ name: 'Exacerbação de asma', cid: 'j45.9', status: 'ativa', diagnosedAt: today() }],
        }),
      )

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        patientCpf: SEED_CPFS.joao,
        patientName: 'João Pedro Oliveira Santos',
        doctorId: rafael.id,
        doctorName: 'Dr. Rafael Moreira Lima',
        status: 'realizado',
        reason: 'Crise de asma',
        documents: [],
      })

      const record = await ctx.api().get(`/api/patients/${SEED_CPFS.joao}`).set(auth(rafael.token))
      expect(record.body.allergies.map((a: { substance: string }) => a.substance)).toContain('Ibuprofeno')
      const medication = record.body.activeMedications.find((m: { name: string }) => m.name === 'Prednisolona')
      expect(medication.prescribedBy).toBe('Dr. Rafael Moreira Lima') // padrão: o médico do atendimento
      const condition = record.body.clinicalConditions.find((c: { name: string }) => c.name === 'Exacerbação de asma')
      expect(condition.cid).toBe('J45.9') // CID gravado em maiúsculas
      expect(record.body.appointmentSummaries[0]).toMatchObject({
        appointmentId: res.body.id,
        doctorName: 'Dr. Rafael Moreira Lima',
        specialty: 'Clínica Médica',
      })

      const logs = await ctx.connection.collection('audit_logs').find({ patientCpf: SEED_CPFS.joao }).toArray()
      expect(logs.map((l) => l.action)).toContain('appointment.create')
    })

    it('conclui um agendamento em vez de criar outro', async () => {
      const scheduled = await scheduledOf(rafael, SEED_CPFS.maria)
      const before = (await agenda(rafael)).length

      const res = await post(
        rafael.token,
        done({
          scheduledAppointmentId: scheduled.id,
          patientCpf: SEED_CPFS.maria,
          reason: undefined,
          summary: 'Glicemia em melhora com a dieta. Mantida conduta e solicitada nova HbA1c.',
        }),
      )

      expect(res.status).toBe(201)
      expect(res.body.id).toBe(scheduled.id)
      expect(res.body.status).toBe('realizado')
      expect(res.body.reason).toBe(scheduled.reason) // sem motivo novo, mantém o do agendamento
      expect((await agenda(rafael)).length).toBe(before)

      const again = await post(
        rafael.token,
        done({ scheduledAppointmentId: scheduled.id, patientCpf: SEED_CPFS.maria }),
      )
      expect(again.status).toBe(409)
      expect(again.body.message).toBe('Este atendimento já foi registrado.')
    })

    it('remarca um agendamento', async () => {
      const scheduled = await scheduledOf(rafael, SEED_CPFS.ana)
      const newDate = inDays(10)

      const res = await post(rafael.token, {
        scheduledAppointmentId: scheduled.id,
        patientCpf: SEED_CPFS.ana,
        doctorId: rafael.id,
        date: newDate,
        status: 'agendado',
        summary: '',
        newAllergies: [],
        newMedications: [],
        newConditions: [],
      })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ id: scheduled.id, status: 'agendado', date: newDate })
    })

    it('cria um agendamento novo', async () => {
      const res = await post(rafael.token, {
        patientCpf: SEED_CPFS.beatriz,
        doctorId: rafael.id,
        date: inDays(20),
        status: 'agendado',
        reason: 'Retorno — alergia alimentar',
        summary: '',
      })

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ status: 'agendado', summary: '', patientName: 'Beatriz Souza Almeida' })
    })

    it('responde 403 quando o doctorId não é o do médico logado', async () => {
      const res = await post(rafael.token, done({ doctorId: camila.id }))

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Você só pode registrar atendimentos em seu próprio nome.')
    })

    it('responde 403 ao concluir agendamento de outro médico', async () => {
      const scheduled = await scheduledOf(camila, SEED_CPFS.carlos)
      const res = await post(rafael.token, done({ scheduledAppointmentId: scheduled.id, patientCpf: SEED_CPFS.carlos }))

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Este agendamento é de outro médico.')
    })

    it('responde 400 quando o agendamento é de outro paciente, sem gravar nada', async () => {
      const scheduled = await scheduledOf(rafael, SEED_CPFS.pedro)
      const before = await ctx.api().get(`/api/patients/${SEED_CPFS.joao}`).set(auth(rafael.token))

      const res = await post(
        rafael.token,
        done({
          scheduledAppointmentId: scheduled.id,
          newAllergies: [{ substance: 'Látex', severity: 'leve', recordedAt: today() }],
        }),
      )

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Este agendamento é de outro paciente.')
      const after = await ctx.api().get(`/api/patients/${SEED_CPFS.joao}`).set(auth(rafael.token))
      expect(after.body.allergies).toEqual(before.body.allergies)
      expect((await scheduledOf(rafael, SEED_CPFS.pedro)).status).toBe('agendado')
    })

    it.each([
      ['inválido', 'abc'],
      ['inexistente', '6729f1c2a3b4c5d6e7f80b99'],
    ])('responde 404 com agendamento %s', async (_case, id) => {
      const res = await post(rafael.token, done({ scheduledAppointmentId: id }))

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Agendamento não encontrado.')
    })

    it('responde 404 quando o paciente não está cadastrado', async () => {
      const res = await post(rafael.token, done({ patientCpf: UNKNOWN_CPF }))

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Paciente não encontrado.')
    })

    it.each([
      [{ date: inDays(1) }, 'Um atendimento realizado não pode ter data no futuro.'],
      [{ summary: 'Ok.' }, 'Descreva o atendimento (mínimo de 10 caracteres).'],
      [{ status: 'agendado', date: inDays(-1), summary: '' }, 'Um agendamento precisa ter data no futuro.'],
      [
        {
          status: 'agendado',
          date: inDays(2),
          summary: '',
          newConditions: [{ name: 'Gripe', status: 'ativa', diagnosedAt: today() }],
        },
        'Um agendamento não altera o prontuário: alergias, medicamentos e condições só entram em atendimento realizado.',
      ],
      [{ date: '01/10/2026 14:30' }, 'Data e hora inválidas. Use o formato ISO 8601.'],
      [{ status: 'cancelado' }, 'Situação do atendimento inválida. Use realizado ou agendado.'],
      [
        { newAllergies: [{ substance: 'Pólen', severity: 'altíssima', recordedAt: today() }] },
        'Alergia 1: Gravidade da alergia inválida. Use leve, moderada ou grave.',
      ],
      [
        { newConditions: [{ name: 'Gripe', cid: 'gripe', status: 'ativa', diagnosedAt: today() }] },
        'Condição 1: CID inválido. Use o formato CID-10 (ex.: I10, J45.0).',
      ],
      [
        { newMedications: [{ name: 'Dipirona', dosage: '', frequency: '6/6h', startDate: today() }] },
        'Medicamento 1: Informe a dosagem do medicamento.',
      ],
    ])('responde 400: %o', async (overrides, message) => {
      const res = await post(rafael.token, done(overrides))

      expect(res.status).toBe(400)
      expect(res.body.message).toBe(message)
    })

    it('responde 403 para o gestor', async () => {
      const res = await post(gestor, done())

      expect(res.status).toBe(403)
    })
  })
})
