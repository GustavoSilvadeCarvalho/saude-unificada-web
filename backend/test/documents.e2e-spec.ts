import { createHash } from 'node:crypto'
import { MAX_UPLOAD_BYTES } from '../src/common/uploads.js'
import { demoPdf } from '../src/database/demo-pdf.js'
import { SEED_CPFS } from '../src/database/seed-data.js'
import { createTestApp, type TestContext } from './helpers.js'

const PDF = demoPdf('Receita de teste', ['Amoxicilina 500 mg, 8 em 8 horas.'])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])

type Doctor = { token: string; id: string }
type Appointment = { id: string; patientCpf: string; status: string; documents: { id: string; fileName: string }[] }

describe('Documentos (receitas, laudos, exames)', () => {
  let ctx: TestContext
  let rafael: Doctor
  let camila: Doctor
  let gestor: string
  /** Atendimento realizado do Dr. Rafael com o João (criado no beforeAll) */
  let appointmentId: string

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

  function upload(token: string, id: string, file: Buffer | null, fileName: string, type = 'receita') {
    const req = ctx.api().post(`/api/appointments/${id}/documents`).set(auth(token)).field('type', type)
    return file ? req.attach('file', file, { filename: fileName, contentType: 'application/pdf' }) : req
  }

  /** Pede o link e baixa o arquivo por ele (sem token, como o navegador faz) */
  async function download(token: string, id: string, documentId: string) {
    const link = await ctx.api().get(`/api/appointments/${id}/documents/${documentId}/download`).set(auth(token))
    expect(link.status).toBe(200)
    return ctx.api().get(new URL(link.body.url).pathname).responseType('blob')
  }

  beforeAll(async () => {
    ctx = await createTestApp()
    const r = await ctx.loginUser('medico@teste.com')
    const c = await ctx.loginUser('cardio@teste.com')
    rafael = { token: r.token, id: r.user.id }
    camila = { token: c.token, id: c.user.id }
    gestor = await ctx.login('gestor@teste.com')

    const created = await ctx
      .api()
      .post('/api/appointments')
      .set(auth(rafael.token))
      .send({
        patientCpf: SEED_CPFS.joao,
        doctorId: rafael.id,
        date: new Date(Date.now() - 60_000).toISOString(),
        status: 'realizado',
        summary: 'Consulta de rotina, sem queixas. Exames solicitados.',
      })
    appointmentId = created.body.id
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('POST /api/appointments/:id/documents', () => {
    it('anexa o arquivo e devolve o documento no formato do contrato', async () => {
      const res = await upload(rafael.token, appointmentId, PDF, 'receita_amoxicilina.pdf')

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({ fileName: 'receita_amoxicilina.pdf', type: 'receita' })
      expect(typeof res.body.id).toBe('string')
      expect(new Date(res.body.uploadedAt).toISOString()).toBe(res.body.uploadedAt)
      expect(res.body).not.toHaveProperty('storageKey')
    })

    it('gera um código de verificação único e o SHA-256 do arquivo', async () => {
      const first = await upload(rafael.token, appointmentId, PDF, 'receita_1.pdf')
      const second = await upload(rafael.token, appointmentId, PDF, 'receita_2.pdf')

      expect(first.body.verificationCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/)
      expect(second.body.verificationCode).not.toBe(first.body.verificationCode)
      expect(first.body.sha256).toBe(createHash('sha256').update(PDF).digest('hex'))
    })

    it('o arquivo baixado é igual ao enviado', async () => {
      const sent = await upload(rafael.token, appointmentId, PDF, 'pedido.pdf', 'outro')
      const res = await download(rafael.token, appointmentId, sent.body.id)

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.headers['content-disposition']).toContain("filename*=UTF-8''pedido.pdf")
      expect(Buffer.compare(res.body, PDF)).toBe(0)
    })

    it('mantém o acento do nome do arquivo', async () => {
      const res = await upload(rafael.token, appointmentId, PDF, 'laudo_cardiológico.pdf', 'laudo')

      expect(res.status).toBe(201)
      expect(res.body.fileName).toBe('laudo_cardiológico.pdf')
    })

    it('laudo e exame também entram na lista de exames do prontuário', async () => {
      const sent = await upload(rafael.token, appointmentId, PNG, 'raio_x_torax.png', 'exame')
      const record = await ctx.api().get(`/api/patients/${SEED_CPFS.joao}`).set(auth(rafael.token))

      const exam = record.body.exams.find((e: { documentId?: string }) => e.documentId === sent.body.id)
      expect(exam).toMatchObject({
        name: 'Exame anexado',
        result: 'Ver arquivo anexado',
        fileName: 'raio_x_torax.png',
        appointmentId,
      })
    })

    it('o documento aparece no atendimento', async () => {
      const res = await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.joao}`).set(auth(rafael.token))
      const appointment = res.body.find((a: Appointment) => a.id === appointmentId)

      expect(appointment.documents.map((d: { fileName: string }) => d.fileName)).toEqual(
        expect.arrayContaining(['receita_amoxicilina.pdf', 'laudo_cardiológico.pdf', 'raio_x_torax.png']),
      )
    })

    it('recusa arquivo que não é PDF, JPG nem PNG, mesmo com nome .pdf', async () => {
      const fake = Buffer.from('MZ\x90\x00 isto é um executável')
      const res = await upload(rafael.token, appointmentId, fake, 'receita.pdf')

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Formato não aceito. Envie PDF, JPG ou PNG.')
    })

    it('responde 413 com arquivo maior que 10 MB', async () => {
      const big = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(MAX_UPLOAD_BYTES)])
      const res = await upload(rafael.token, appointmentId, big, 'grande.pdf')

      expect(res.status).toBe(413)
      expect(res.body.message).toBe('Arquivo muito grande. O limite é de 10 MB.')
    })

    it('responde 400 sem arquivo, com o campo errado ou com tipo inválido', async () => {
      const noFile = await upload(rafael.token, appointmentId, null, '')
      expect(noFile.status).toBe(400)
      expect(noFile.body.message).toBe('Envie o arquivo no campo "file".')

      const wrongField = await ctx
        .api()
        .post(`/api/appointments/${appointmentId}/documents`)
        .set(auth(rafael.token))
        .field('type', 'receita')
        .attach('arquivo', PDF, 'receita.pdf')
      expect(wrongField.status).toBe(400)
      expect(wrongField.body.message).toBe('Envie o arquivo no campo "file".')

      const wrongType = await upload(rafael.token, appointmentId, PDF, 'foto.pdf', 'foto')
      expect(wrongType.status).toBe(400)
      expect(wrongType.body.message).toBe('Tipo de documento inválido. Use receita, laudo, exame ou outro.')
    })

    it('responde 403 quando o atendimento é de outro médico', async () => {
      const res = await upload(camila.token, appointmentId, PDF, 'receita.pdf')

      expect(res.status).toBe(403)
      expect(res.body.message).toBe('Só o médico do atendimento pode anexar documentos.')
    })

    it.each([
      ['inválido', 'abc'],
      ['inexistente', '6729f1c2a3b4c5d6e7f80b99'],
    ])('responde 404 com atendimento %s', async (_case, id) => {
      const res = await upload(rafael.token, id, PDF, 'receita.pdf')

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Atendimento não encontrado.')
    })

    it('responde 403 para o gestor', async () => {
      const res = await upload(gestor, appointmentId, PDF, 'receita.pdf')

      expect(res.status).toBe(403)
    })

    it('registra o upload na auditoria', async () => {
      const logs = await ctx.connection.collection('audit_logs').find({ patientCpf: SEED_CPFS.joao }).toArray()

      expect(logs.map((l) => l.action)).toContain('document.upload')
    })
  })

  describe('GET /api/appointments/:id/documents/:documentId/download', () => {
    it('qualquer médico baixa os documentos do prontuário (inclusive os do seed)', async () => {
      // Atendimento da Ana com o Dr. Rafael tem uma receita no seed; a Dra. Camila também pode ver
      const res = await ctx.api().get(`/api/appointments?patientCpf=${SEED_CPFS.ana}`).set(auth(camila.token))
      const withDocument = res.body.find((a: Appointment) => a.documents.length > 0)
      const file = await download(camila.token, withDocument.id, withDocument.documents[0].id)

      expect(file.status).toBe(200)
      expect(file.body.subarray(0, 5).toString()).toBe('%PDF-')

      const logs = await ctx.connection.collection('audit_logs').find({ patientCpf: SEED_CPFS.ana }).toArray()
      expect(logs.map((l) => l.action)).toContain('document.download')
    })

    it('o link expira e não aceita adulteração', async () => {
      const sent = await upload(rafael.token, appointmentId, PDF, 'atestado.pdf', 'outro')
      const link = await ctx
        .api()
        .get(`/api/appointments/${appointmentId}/documents/${sent.body.id}/download`)
        .set(auth(rafael.token))
      const path = new URL(link.body.url).pathname

      const tampered = await ctx.api().get(`${path.slice(0, -3)}xyz`)
      expect(tampered.status).toBe(404)
      expect(tampered.body.message).toBe('Link de download inválido ou expirado. Abra o documento de novo pelo prontuário.')

      vi.useFakeTimers({ now: Date.now() + 6 * 60 * 1000, toFake: ['Date'] })
      const expired = await ctx.api().get(path)
      vi.useRealTimers()
      expect(expired.status).toBe(404)
    })

    it('responde 404 com documento inexistente', async () => {
      const res = await ctx
        .api()
        .get(`/api/appointments/${appointmentId}/documents/6729f1c2a3b4c5d6e7f80c99/download`)
        .set(auth(rafael.token))

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Documento não encontrado.')
    })

    it('responde 401 sem token e 403 para o gestor', async () => {
      const path = `/api/appointments/${appointmentId}/documents/6729f1c2a3b4c5d6e7f80c99/download`

      expect((await ctx.api().get(path)).status).toBe(401)
      expect((await ctx.api().get(path).set(auth(gestor))).status).toBe(403)
    })
  })

  describe('GET /api/verify/:code (público)', () => {
    let code: string

    beforeAll(async () => {
      code = (await upload(rafael.token, appointmentId, PDF, 'receita_verificar.pdf')).body.verificationCode
    })

    it('confere o documento sem login, mostrando só as iniciais do paciente', async () => {
      const res = await ctx.api().get(`/api/verify/${code}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        valid: true,
        verificationCode: code,
        type: 'receita',
        fileName: 'receita_verificar.pdf',
        doctorName: 'Dr. Rafael Moreira Lima',
        doctorCrm: 'CRM-SP 123456',
        patientInitials: 'J. P. O. S.',
        sha256: createHash('sha256').update(PDF).digest('hex'),
      })
      expect(JSON.stringify(res.body)).not.toContain(SEED_CPFS.joao)
    })

    it('aceita o código digitado em minúsculas, sem traços e com O no lugar de 0', async () => {
      const typed = code.toLowerCase().replace(/-/g, '').replace(/0/g, 'o')

      const res = await ctx.api().get(`/api/verify/${typed}`)

      expect(res.status).toBe(200)
      expect(res.body.verificationCode).toBe(code)
    })

    it.each(['ZZZZ-ZZZZ-ZZZZ', 'curto', '$where'])('responde 404 para %s', async (bad) => {
      const res = await ctx.api().get(`/api/verify/${encodeURIComponent(bad)}`)

      expect(res.status).toBe(404)
      expect(res.body.message).toBe('Nenhum documento com esse código. Confira o código impresso no documento.')
    })
  })
})
