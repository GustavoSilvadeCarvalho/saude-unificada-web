import { SEED_CPFS } from '../src/database/seed-data.js'
import { createTestApp, type TestContext } from './helpers.js'

// CPF válido que não está no seed (usado para cadastrar)
const NEW_CPF = '11144477735'
// CPF com dígito verificador errado
const INVALID_CPF = '12345678900'

const newPatient = {
  cpf: NEW_CPF,
  fullName: 'Fulano de Tal',
  birthDate: '1990-05-10',
  sex: 'M',
  bloodType: 'Não informado',
  phone: '(19) 99999-0000',
  email: 'fulano@email.com',
  region: 'Campinas',
}

describe('Pacientes', () => {
  let ctx: TestContext
  let medico: string
  let gestor: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const auditLogs = (patientCpf: string) => ctx.connection.collection('audit_logs').find({ patientCpf }).toArray()

  beforeAll(async () => {
    ctx = await createTestApp()
    medico = await ctx.login('medico@teste.com')
    gestor = await ctx.login('gestor@teste.com')
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('GET /api/patients/:cpf', () => {
    it('devolve o prontuário unificado no formato do contrato', async () => {
      const res = await ctx.api().get(`/api/patients/${SEED_CPFS.maria}`).set(auth(medico))

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        cpf: SEED_CPFS.maria,
        fullName: 'Maria Aparecida da Silva',
        birthDate: '1958-03-14',
        sex: 'F',
        bloodType: 'O-',
        region: 'Grande São Paulo',
        appointmentSummaries: [],
      })
      expect(res.body.allergies).toHaveLength(2)
      expect(res.body.allergies[0]).toMatchObject({ substance: 'Penicilina', severity: 'grave', reaction: 'Anafilaxia' })
      expect(res.body.activeMedications).toHaveLength(3)
      expect(res.body.procedures).toHaveLength(2)
      expect(res.body.exams).toHaveLength(3)
      expect(res.body.clinicalConditions).toHaveLength(3)
    })

    it('cada item das listas tem "id" em texto e nenhum campo interno do MongoDB', async () => {
      const res = await ctx.api().get(`/api/patients/${SEED_CPFS.maria}`).set(auth(medico))
      const lists = ['allergies', 'activeMedications', 'procedures', 'exams', 'clinicalConditions']

      for (const list of lists) {
        for (const item of res.body[list]) {
          expect(typeof item.id, `${list}.id`).toBe('string')
          expect(item, list).not.toHaveProperty('_id')
        }
      }
      expect(res.body).not.toHaveProperty('_id')
      expect(res.body).not.toHaveProperty('__v')
    })

    it('aceita o CPF com máscara', async () => {
      const masked = SEED_CPFS.joao.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      const res = await ctx.api().get(`/api/patients/${masked}`).set(auth(medico))

      expect(res.status).toBe(200)
      expect(res.body.fullName).toBe('João Pedro Oliveira Santos')
    })

    it('responde 404 quando o CPF não está cadastrado', async () => {
      const res = await ctx.api().get(`/api/patients/${NEW_CPF}`).set(auth(medico))

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ statusCode: 404, message: 'Paciente não encontrado.' })
    })

    it('responde 400 com CPF inválido', async () => {
      const res = await ctx.api().get(`/api/patients/${INVALID_CPF}`).set(auth(medico))

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('CPF inválido.')
    })

    it('responde 403 para o gestor (prontuário é só para médicos)', async () => {
      const res = await ctx.api().get(`/api/patients/${SEED_CPFS.maria}`).set(auth(gestor))

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Seu perfil não tem permissão para acessar este recurso.')
    })

    it('responde 401 sem token', async () => {
      const res = await ctx.api().get(`/api/patients/${SEED_CPFS.maria}`)

      expect(res.status).toBe(401)
    })

    it('rejeita tentativa de injeção NoSQL na URL', async () => {
      const res = await ctx.api().get('/api/patients/%7B%22%24ne%22%3Anull%7D').set(auth(medico))

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/patients', () => {
    it('cadastra o paciente com as listas do prontuário vazias', async () => {
      const res = await ctx.api().post('/api/patients').set(auth(medico)).send(newPatient)

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        ...newPatient,
        allergies: [],
        activeMedications: [],
        procedures: [],
        exams: [],
        clinicalConditions: [],
        appointmentSummaries: [],
      })

      const found = await ctx.api().get(`/api/patients/${NEW_CPF}`).set(auth(medico))
      expect(found.status).toBe(200)
      expect(found.body.fullName).toBe('Fulano de Tal')
    })

    it('responde 409 quando o CPF já está cadastrado', async () => {
      const res = await ctx
        .api()
        .post('/api/patients')
        .set(auth(medico))
        .send({ ...newPatient, cpf: SEED_CPFS.maria })

      expect(res.status).toBe(409)
      expect(res.body).toEqual({ statusCode: 409, message: 'Já existe um paciente cadastrado com este CPF.' })
    })

    it('aceita CPF com máscara e trata telefone e e-mail vazios como não informados', async () => {
      const res = await ctx
        .api()
        .post('/api/patients')
        .set(auth(medico))
        .send({ ...newPatient, cpf: '529.982.247-25', phone: '', email: '' })

      expect(res.status).toBe(201)
      expect(res.body.cpf).toBe('52998224725')
      expect(res.body).not.toHaveProperty('phone')
      expect(res.body).not.toHaveProperty('email')
    })

    it('ignora listas do prontuário enviadas no cadastro (só entram pelos atendimentos)', async () => {
      const res = await ctx
        .api()
        .post('/api/patients')
        .set(auth(medico))
        .send({
          ...newPatient,
          cpf: '39053344705',
          allergies: [{ substance: 'Inventada', severity: 'grave', recordedAt: '2020-01-01' }],
        })

      expect(res.status).toBe(201)
      expect(res.body.allergies).toEqual([])
    })

    it.each([
      [{ cpf: INVALID_CPF }, 'CPF inválido.'],
      [{ fullName: '   ' }, 'Informe o nome completo.'],
      [{ birthDate: '10/05/1990' }, 'Data de nascimento inválida. Use o formato AAAA-MM-DD.'],
      [{ birthDate: '2999-01-01' }, 'Data de nascimento inválida. Use o formato AAAA-MM-DD.'],
      [{ birthDate: '1990-02-30' }, 'Data de nascimento inválida. Use o formato AAAA-MM-DD.'],
      [{ sex: 'X' }, 'Sexo inválido. Use F, M ou Outro.'],
      [{ bloodType: 'C+' }, 'Tipo sanguíneo inválido.'],
      [{ email: 'nao-e-email' }, 'E-mail inválido.'],
      [{ region: 'Marte' }, 'Região inválida.'],
    ])('responde 400 com dado inválido: %o', async (override, message) => {
      const res = await ctx
        .api()
        .post('/api/patients')
        .set(auth(medico))
        .send({ ...newPatient, cpf: '86288366757', ...override })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe(message)
    })

    it('responde 403 para o gestor', async () => {
      const res = await ctx
        .api()
        .post('/api/patients')
        .set(auth(gestor))
        .send({ ...newPatient, cpf: '86288366757' })

      expect(res.status).toBe(403)
    })
  })

  describe('Auditoria (LGPD)', () => {
    it('registra quem viu o prontuário', async () => {
      const cpf = SEED_CPFS.ana
      await ctx.api().get(`/api/patients/${cpf}`).set(auth(medico)).expect(200)

      const logs = await auditLogs(cpf)
      expect(logs).toHaveLength(1)
      expect(logs[0]).toMatchObject({
        action: 'patient.view',
        userName: 'Dr. Rafael Moreira Lima',
        userRole: 'medico',
        patientCpf: cpf,
      })
      expect(logs[0].at).toBeInstanceOf(Date)
    })

    it('registra o cadastro de paciente', async () => {
      const logs = await auditLogs(NEW_CPF)
      expect(logs.map((log) => log.action)).toContain('patient.create')
    })

    it('não registra nada quando o acesso é negado', async () => {
      const cpf = SEED_CPFS.carlos
      await ctx.api().get(`/api/patients/${cpf}`).set(auth(gestor)).expect(403)
      await ctx.api().get(`/api/patients/${cpf}`).expect(401)

      expect(await auditLogs(cpf)).toHaveLength(0)
    })
  })
})
