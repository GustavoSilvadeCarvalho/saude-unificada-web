import { REGIONS } from '../src/common/regions.js'
import { lastMonths } from '../src/database/regional-data.js'
import { createTestApp, type TestContext } from './helpers.js'

type RegionalRecord = {
  region: string
  month: string
  appointments: number
  uniquePatients: number
  conditions: { name: string; count: number }[]
}

describe('Dados regionais (painel do gestor)', () => {
  let ctx: TestContext
  let gestor: string
  let medico: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })
  const regionalData = (query = '') => ctx.api().get(`/api/regional-data${query}`).set(auth(gestor))

  beforeAll(async () => {
    ctx = await createTestApp()
    gestor = await ctx.login('gestor@teste.com')
    medico = await ctx.login('medico@teste.com')
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('GET /api/regions', () => {
    it.each([['gestor'], ['médico']])('lista as regiões na ordem de exibição (%s)', async (who) => {
      const res = await ctx.api().get('/api/regions').set(auth(who === 'gestor' ? gestor : medico))

      expect(res.status).toBe(200)
      expect(res.body).toEqual([...REGIONS])
    })

    it('responde 401 sem token', async () => {
      expect((await ctx.api().get('/api/regions')).status).toBe(401)
    })
  })

  describe('GET /api/regional-data', () => {
    it('sem filtros: uma linha por região por mês (12 meses completos), ordenada por região e mês', async () => {
      const res = await regionalData()
      const rows: RegionalRecord[] = res.body

      expect(res.status).toBe(200)
      expect(rows).toHaveLength(REGIONS.length * 12)
      const keys = rows.map((r) => `${r.region}|${r.month}`)
      expect(keys).toEqual([...keys].sort())
      expect(new Set(rows.map((r) => r.month))).toEqual(new Set(lastMonths()))
    })

    it('cada linha está no formato do contrato, com as condições da maior para a menor', async () => {
      const [row] = (await regionalData()).body as RegionalRecord[]

      expect(Object.keys(row).sort()).toEqual(['appointments', 'conditions', 'month', 'region', 'uniquePatients'])
      expect(row.uniquePatients).toBeLessThanOrEqual(row.appointments)
      const counts = row.conditions.map((c) => c.count)
      expect(counts).toEqual([...counts].sort((a, b) => b - a))
      expect(Object.keys(row.conditions[0]).sort()).toEqual(['count', 'name'])
    })

    it('é anônimo: nenhum CPF, nome de paciente ou id sai na resposta', async () => {
      const text = JSON.stringify((await regionalData()).body)

      expect(text).not.toMatch(/cpf|patientName|fullName|"_id"|"id"/i)
      expect(text).not.toMatch(/\d{11}/)
    })

    it('filtra por região', async () => {
      const rows: RegionalRecord[] = (await regionalData('?region=Campinas')).body

      expect(rows).toHaveLength(12)
      expect(rows.every((r) => r.region === 'Campinas')).toBe(true)
    })

    it('filtra pelo intervalo de meses (inclusive)', async () => {
      const months = lastMonths()
      const [from, to] = [months[3], months[5]]
      const rows: RegionalRecord[] = (await regionalData(`?from=${from}&to=${to}`)).body

      expect(rows).toHaveLength(REGIONS.length * 3)
      expect(rows.every((r) => r.month >= from && r.month <= to)).toBe(true)
    })

    it('região vazia = todas', async () => {
      expect((await regionalData('?region=')).body).toHaveLength(REGIONS.length * 12)
    })

    it.each([
      ['?from=2026-13', 'Mês inicial inválido. Use o formato AAAA-MM.'],
      ['?to=10/2026', 'Mês final inválido. Use o formato AAAA-MM.'],
      ['?from=2026-09&to=2026-01', 'O mês inicial não pode ser depois do mês final.'],
      ['?region=Marte', 'Região inválida.'],
    ])('responde 400 com %s', async (query, message) => {
      const res = await regionalData(query)

      expect(res.status).toBe(400)
      expect(res.body.message).toBe(message)
    })

    it('responde 403 para o médico (painel é só do gestor)', async () => {
      const res = await ctx.api().get('/api/regional-data').set(auth(medico))

      expect(res.status).toBe(403)
    })
  })

  describe('Cadastro de paciente usa as regiões do banco', () => {
    it('aceita região nova cadastrada na coleção e recusa a removida', async () => {
      const regions = ctx.connection.collection('regions')
      await regions.insertOne({ name: 'Piracicaba', order: 99 })
      await regions.deleteOne({ name: 'Sorocaba' })

      const patient = {
        cpf: '69513769135',
        fullName: 'Paciente de Piracicaba',
        birthDate: '1980-01-01',
        sex: 'F',
        bloodType: 'A+',
        region: 'Piracicaba',
      }
      const created = await ctx.api().post('/api/patients').set(auth(medico)).send(patient)
      expect(created.status).toBe(201)

      const removed = await ctx
        .api()
        .post('/api/patients')
        .set(auth(medico))
        .send({ ...patient, cpf: '46457663508', region: 'Sorocaba' })
      expect(removed.status).toBe(400)
      expect(removed.body.message).toBe('Região inválida.')
    })
  })
})
