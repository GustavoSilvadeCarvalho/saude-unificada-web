import { SEED_CPFS, SEED_PATIENT_PASSWORD } from '../src/database/seed-data.js'
import { createTestApp, type TestContext } from './helpers.js'

const masked = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

type Appointment = { id: string; patientCpf: string; status: string; date: string; documents: { id: string }[]; instructions?: string }

describe('App do paciente (login por CPF, estilo gov.br)', () => {
  let ctx: TestContext
  let maria: string
  let medico: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const patientLogin = (cpf: string, password: string) =>
    ctx.api().post('/api/auth/patient-login').send({ cpf, password })
  const register = (body: object) => ctx.api().post('/api/auth/patient-register').send(body)

  beforeAll(async () => {
    ctx = await createTestApp()
    maria = (await patientLogin(SEED_CPFS.maria, SEED_PATIENT_PASSWORD)).body.token
    medico = await ctx.login('medico@teste.com')
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('POST /api/auth/patient-login', () => {
    it('entra com CPF e senha e devolve o perfil paciente com o CPF', async () => {
      const res = await patientLogin(SEED_CPFS.maria, SEED_PATIENT_PASSWORD)

      expect(res.status).toBe(200)
      expect(typeof res.body.token).toBe('string')
      expect(res.body.user).toMatchObject({
        name: 'Maria Aparecida da Silva',
        role: 'paciente',
        cpf: SEED_CPFS.maria,
      })
      expect(res.body.user).not.toHaveProperty('passwordHash')
      expect(res.body.user).not.toHaveProperty('email')
    })

    it('aceita o CPF com máscara', async () => {
      const res = await patientLogin(masked(SEED_CPFS.joao), SEED_PATIENT_PASSWORD)

      expect(res.status).toBe(200)
      expect(res.body.user.name).toBe('João Pedro Oliveira Santos')
    })

    it('responde 401 com a mesma mensagem para senha errada e para CPF sem conta', async () => {
      const wrongPassword = await patientLogin(SEED_CPFS.maria, 'errada123')
      const noAccount = await patientLogin(SEED_CPFS.carlos, SEED_PATIENT_PASSWORD)

      for (const res of [wrongPassword, noAccount]) {
        expect(res.status).toBe(401)
        expect(res.body.message).toBe('CPF ou senha inválidos.')
      }
    })

    it('responde 400 com CPF inválido', async () => {
      const res = await patientLogin('12345678909', SEED_PATIENT_PASSWORD)

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Este é um CPF de exemplo e não pode ser usado. Informe o CPF real do paciente.')
    })

    it('GET /api/auth/me devolve a conta do paciente', async () => {
      const res = await ctx.api().get('/api/auth/me').set(auth(maria))

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ role: 'paciente', cpf: SEED_CPFS.maria })
    })
  })

  describe('POST /api/auth/patient-register (primeiro acesso)', () => {
    const ana = { cpf: SEED_CPFS.ana, birthDate: '1996-11-05', password: 'meuApp2026' }

    it('cria a conta quando CPF e data de nascimento batem com o prontuário, e já entra', async () => {
      const res = await register(ana)

      expect(res.status).toBe(201)
      expect(res.body.user).toMatchObject({ name: 'Ana Luiza Ferreira Costa', role: 'paciente', cpf: SEED_CPFS.ana })

      const login = await patientLogin(masked(SEED_CPFS.ana), 'meuApp2026')
      expect(login.status).toBe(200)
    })

    it('responde 409 se o CPF já tem conta', async () => {
      const res = await register(ana)

      expect(res.status).toBe(409)
      expect(res.body.message).toBe('Este CPF já tem conta. Use a opção Entrar.')
    })

    it('responde 400 com a mesma mensagem para data errada e CPF sem prontuário', async () => {
      const wrongDate = await register({ ...ana, cpf: SEED_CPFS.beatriz, birthDate: '1990-01-01' })
      const noRecord = await register({ ...ana, cpf: '12500605752' })

      for (const res of [wrongDate, noRecord]) {
        expect(res.status).toBe(400)
        expect(res.body.message).toMatch(/^Não encontramos um cadastro com esse CPF e essa data de nascimento\./)
      }
    })

    it.each([
      ['curta1', 'A senha precisa ter pelo menos 8 caracteres.'],
      ['semnumeros', 'A senha precisa ter letras e números.'],
      ['Senha123', 'Essa senha é muito comum. Escolha outra.'],
      ['bia17092012', 'A senha não pode conter a sua data de nascimento.'],
      [`x${SEED_CPFS.beatriz.slice(2, 8)}y`, 'A senha não pode conter o seu CPF.'],
    ])('responde 400 com senha fraca: %j', async (password, message) => {
      // Beatriz nasceu em 2012-09-17 e ainda não tem conta
      const res = await register({ cpf: SEED_CPFS.beatriz, birthDate: '2012-09-17', password })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe(message)
    })

    it('responde 400 com data de nascimento em formato errado', async () => {
      const res = await register({ ...ana, birthDate: '05/11/1996' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Data de nascimento inválida. Use o formato AAAA-MM-DD.')
    })
  })

  describe('Rotas /api/me (só leitura dos próprios dados)', () => {
    it('GET /me/record: carteira digital de saúde', async () => {
      const res = await ctx.api().get('/api/me/record').set(auth(maria))

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ cpf: SEED_CPFS.maria, fullName: 'Maria Aparecida da Silva', bloodType: 'O-' })
      expect(res.body.allergies.length).toBeGreaterThan(0)
      expect(res.body.appointmentSummaries.length).toBeGreaterThan(0)
    })

    it('GET /me/appointments: histórico e próximos, só da própria paciente', async () => {
      const all: Appointment[] = (await ctx.api().get('/api/me/appointments').set(auth(maria))).body
      const next: Appointment[] = (await ctx.api().get('/api/me/appointments?status=agendado').set(auth(maria))).body
      const past: Appointment[] = (await ctx.api().get('/api/me/appointments?status=realizado').set(auth(maria))).body

      expect(all.length).toBe(next.length + past.length)
      expect(all.every((a) => a.patientCpf === SEED_CPFS.maria)).toBe(true)
      expect(next.every((a) => a.status === 'agendado')).toBe(true)
      expect(past.every((a) => a.status === 'realizado')).toBe(true)
      expect(past[0].documents.length).toBeGreaterThan(0)
      expect(next[0].instructions).toContain('Jejum de 8 horas')
    })

    it('GET /me/appointments recusa situação inválida', async () => {
      const res = await ctx.api().get('/api/me/appointments?status=cancelado').set(auth(maria))

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Situação inválida. Use realizado ou agendado.')
    })

    it('GET /me/exams: do mais recente ao mais antigo', async () => {
      const res = await ctx.api().get('/api/me/exams').set(auth(maria))
      const dates = res.body.map((e: { date: string }) => e.date)

      expect(res.status).toBe(200)
      expect(dates.length).toBe(3)
      expect(dates).toEqual([...dates].sort().reverse())
    })

    it('GET /me/access-log: mostra quem acessou o prontuário (LGPD)', async () => {
      await ctx.api().get(`/api/patients/${SEED_CPFS.maria}`).set(auth(medico)).expect(200)
      const res = await ctx.api().get('/api/me/access-log').set(auth(maria))

      expect(res.status).toBe(200)
      expect(res.body[0]).toMatchObject({
        description: 'Abriu o seu prontuário',
        userName: 'Dr. Rafael Moreira Lima',
        userRole: 'medico',
        action: 'patient.view',
      })
      // Os acessos da própria paciente não aparecem
      expect(res.body.every((e: { userRole: string }) => e.userRole !== 'paciente')).toBe(true)
    })

    it('baixa um documento próprio e não consegue o de outro paciente', async () => {
      const own: Appointment[] = (await ctx.api().get('/api/me/appointments?status=realizado').set(auth(maria))).body
      const withDoc = own.find((a) => a.documents.length > 0) as Appointment
      const link = await ctx
        .api()
        .get(`/api/me/appointments/${withDoc.id}/documents/${withDoc.documents[0].id}/download`)
        .set(auth(maria))
      expect(link.status).toBe(200)
      const file = await ctx.api().get(new URL(link.body.url).pathname).responseType('blob')
      expect(file.body.subarray(0, 5).toString()).toBe('%PDF-')

      // Documento da Ana (outro paciente), pego pelo médico
      const anas: Appointment[] = (
        await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.ana}`).set(auth(medico))
      ).body
      const other = anas.find((a) => a.documents.length > 0) as Appointment
      const denied = await ctx
        .api()
        .get(`/api/me/appointments/${other.id}/documents/${other.documents[0].id}/download`)
        .set(auth(maria))
      expect(denied.status).toBe(404)
    })
  })

  describe('Separação de perfis', () => {
    it.each([
      ['GET', `/api/patients/${SEED_CPFS.joao}`],
      ['GET', `/api/appointments?patientCpf=${SEED_CPFS.maria}`],
      ['GET', '/api/regional-data'],
      ['GET', '/api/regions'],
    ])('paciente recebe 403 em %s %s', async (_method, path) => {
      const res = await ctx.api().get(path).set(auth(maria))

      expect(res.status).toBe(403)
    })

    it('médico recebe 403 nas rotas do app', async () => {
      const res = await ctx.api().get('/api/me/record').set(auth(medico))

      expect(res.status).toBe(403)
    })

    it('paciente não entra pelo login do site (e-mail)', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'maria.silva@email.com', password: SEED_PATIENT_PASSWORD })

      expect(res.status).toBe(401)
    })
  })
})
