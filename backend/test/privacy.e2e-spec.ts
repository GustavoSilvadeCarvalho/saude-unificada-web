import { SEED_CPFS, SEED_PATIENT_PASSWORD } from '../src/database/seed-data.js'
import { createTestApp, type TestContext } from './helpers.js'

type Doctor = { token: string; id: string }
type LinkedDoctor = { doctorId: string; name: string; blocked: boolean; blockedAt?: string }

const BLOCKED = 'O paciente bloqueou o seu acesso a este prontuário.'

describe('Privacidade: o paciente bloqueia o acesso de um médico', () => {
  let ctx: TestContext
  let maria: string
  let rafael: Doctor
  let camila: Doctor
  let gestorId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const doctors = async (): Promise<LinkedDoctor[]> =>
    (await ctx.api().get('/api/me/doctors').set(auth(maria))).body
  const record = (doctor: Doctor) => ctx.api().get(`/api/patients/${SEED_CPFS.maria}`).set(auth(doctor.token))

  beforeAll(async () => {
    ctx = await createTestApp()
    maria = (
      await ctx.api().post('/api/auth/patient-login').send({ cpf: SEED_CPFS.maria, password: SEED_PATIENT_PASSWORD })
    ).body.token
    const r = await ctx.loginUser('medico@teste.com')
    const c = await ctx.loginUser('cardio@teste.com')
    rafael = { token: r.token, id: r.user.id }
    camila = { token: c.token, id: c.user.id }
    gestorId = (await ctx.loginUser('gestor@teste.com')).user.id
  })

  afterAll(async () => {
    await ctx?.close()
  })

  it('GET /me/doctors lista quem atendeu a paciente, sem bloqueio', async () => {
    const list = await doctors()

    expect(list).toContainEqual(expect.objectContaining({ doctorId: rafael.id, name: 'Dr. Rafael Moreira Lima', blocked: false }))
    expect(list.some((d) => d.doctorId === gestorId)).toBe(false)
  })

  it('bloqueia o Dr. Rafael: prontuário, histórico, documentos e novo atendimento dão 403', async () => {
    const res = await ctx.api().put(`/api/me/blocked-doctors/${rafael.id}`).set(auth(maria))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ doctorId: rafael.id, blocked: true })
    expect(new Date(res.body.blockedAt).toISOString()).toBe(res.body.blockedAt)

    const view = await record(rafael)
    expect(view.status).toBe(403)
    expect(view.body.message).toBe(BLOCKED)

    const history = await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.maria}`).set(auth(rafael.token))
    expect(history.status).toBe(403)

    const created = await ctx
      .api()
      .post('/api/appointments')
      .set(auth(rafael.token))
      .send({ patientCpf: SEED_CPFS.maria, doctorId: rafael.id, date: new Date(Date.now() + 86_400_000).toISOString(), status: 'agendado', summary: '' })
    expect(created.status).toBe(403)
    expect(created.body.message).toBe(BLOCKED)
  })

  it('o médico bloqueado também não baixa documentos da paciente', async () => {
    const own = (await ctx.api().get('/api/me/appointments?status=realizado').set(auth(maria))).body
    const withDoc = own.find((a: { documents: unknown[] }) => a.documents.length > 0)

    const res = await ctx
      .api()
      .get(`/api/appointments/${withDoc.id}/documents/${withDoc.documents[0].id}/download`)
      .set(auth(rafael.token))

    expect(res.status).toBe(403)
  })

  it('os outros médicos continuam com acesso e a lista mostra o bloqueio', async () => {
    expect((await record(camila)).status).toBe(200)
    expect((await doctors()).find((d) => d.doctorId === rafael.id)?.blocked).toBe(true)
  })

  it('o acesso negado não aparece como acesso no histórico da paciente', async () => {
    const log = (await ctx.api().get('/api/me/access-log').set(auth(maria))).body
    expect(log.some((entry: { userName: string }) => entry.userName === 'Dr. Rafael Moreira Lima')).toBe(false)
  })

  it('bloquear de novo não dá erro', async () => {
    const res = await ctx.api().put(`/api/me/blocked-doctors/${rafael.id}`).set(auth(maria))
    expect(res.status).toBe(200)
  })

  it('DELETE libera o acesso de novo', async () => {
    const res = await ctx.api().delete(`/api/me/blocked-doctors/${rafael.id}`).set(auth(maria))

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ doctorId: rafael.id, blocked: false })
    expect((await record(rafael)).status).toBe(200)
  })

  it.each([
    ['id inválido', 'abc'],
    ['id de quem não é médico (gestor)', 'GESTOR'],
    ['médico inexistente', '6729f1c2a3b4c5d6e7f80999'],
  ])('responde 404 para %s', async (_label, id) => {
    const doctorId = id === 'GESTOR' ? gestorId : id
    const res = await ctx.api().put(`/api/me/blocked-doctors/${doctorId}`).set(auth(maria))

    expect(res.status).toBe(404)
    expect(res.body.message).toBe('Médico não encontrado.')
  })

  it('médico não usa as rotas de bloqueio (403)', async () => {
    const res = await ctx.api().put(`/api/me/blocked-doctors/${camila.id}`).set(auth(rafael.token))
    expect(res.status).toBe(403)
  })
})
