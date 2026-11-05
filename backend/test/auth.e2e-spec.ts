import { JwtService } from '@nestjs/jwt'
import { createTestApp, type TestContext } from './helpers.js'

describe('Autenticação', () => {
  let ctx: TestContext

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('POST /api/auth/login', () => {
    it('faz login do médico e devolve token e dados do usuário', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'medico@teste.com', password: '123456' })

      expect(res.status).toBe(200)
      expect(typeof res.body.token).toBe('string')
      expect(res.body.user).toMatchObject({
        name: 'Dr. Rafael Moreira Lima',
        email: 'medico@teste.com',
        role: 'medico',
        crm: 'CRM-SP 123456',
        specialty: 'Clínica Médica',
        institution: 'UBS Vila Mariana',
      })
      expect(typeof res.body.user.id).toBe('string')
    })

    it('nunca devolve a senha nem campos internos do MongoDB', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'medico@teste.com', password: '123456' })

      expect(res.body.user).not.toHaveProperty('password')
      expect(res.body.user).not.toHaveProperty('passwordHash')
      expect(res.body.user).not.toHaveProperty('_id')
      expect(res.body.user).not.toHaveProperty('__v')
      expect(JSON.stringify(res.body)).not.toContain('$2') // prefixo de hash bcrypt
    })

    it('aceita o e-mail com letras maiúsculas', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'GESTOR@teste.com', password: '123456' })

      expect(res.status).toBe(200)
      expect(res.body.user.role).toBe('gestor')
      expect(res.body.user).not.toHaveProperty('crm')
    })

    it('responde 401 com senha errada', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'medico@teste.com', password: 'errada' })

      expect(res.status).toBe(401)
      expect(res.body).toEqual({ statusCode: 401, message: 'E-mail ou senha inválidos.' })
    })

    it('responde 401 com a mesma mensagem para e-mail inexistente (não revela quais e-mails existem)', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'ninguem@teste.com', password: '123456' })

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('E-mail ou senha inválidos.')
    })

    it('responde 400 com e-mail inválido', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'nao-e-email', password: '123456' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Informe um e-mail válido.')
    })

    it('responde 400 sem senha', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: 'medico@teste.com', password: '' })

      expect(res.status).toBe(400)
      expect(res.body.message).toBe('Informe a senha.')
    })

    it('rejeita tentativa de injeção NoSQL no e-mail', async () => {
      const res = await ctx.api().post('/api/auth/login').send({ email: { $ne: null }, password: '123456' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/auth/me', () => {
    it('devolve o usuário logado', async () => {
      const token = await ctx.login('cardio@teste.com')
      const res = await ctx.api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({ email: 'cardio@teste.com', role: 'medico', specialty: 'Cardiologia' })
      expect(res.body).not.toHaveProperty('passwordHash')
    })

    it('responde 401 sem token', async () => {
      const res = await ctx.api().get('/api/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Faça login para continuar.')
    })

    it('responde 401 com token inválido', async () => {
      const res = await ctx.api().get('/api/auth/me').set('Authorization', 'Bearer token-qualquer')

      expect(res.status).toBe(401)
      expect(res.body.message).toBe('Sessão inválida ou expirada. Faça login novamente.')
    })

    it('responde 401 com token assinado por outro segredo (token adulterado)', async () => {
      const forged = new JwtService({ secret: 'segredo-do-atacante' }).sign({ sub: 'x', name: 'Hacker', role: 'gestor' })
      const res = await ctx.api().get('/api/auth/me').set('Authorization', `Bearer ${forged}`)

      expect(res.status).toBe(401)
    })
  })
})
