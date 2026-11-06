import { KEEP_ALIVE_TIMEOUT_MS } from '../src/app.setup.js'
import { createTestApp, type TestContext } from './helpers.js'

// Testes de segurança (não funcionais). Os casos estão descritos em tests/seguranca/casos-de-seguranca.md

describe('Segurança', () => {
  let ctx: TestContext

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  describe('Cabeçalhos HTTP (helmet)', () => {
    it('manda os cabeçalhos de segurança em toda resposta', async () => {
      const res = await ctx.api().get('/api/health/live')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['strict-transport-security']).toContain('max-age=')
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(res.headers['content-security-policy']).toContain("default-src 'self'")
      expect(res.headers['referrer-policy']).toBe('no-referrer')
    })

    it('segura a conexão aberta por mais tempo que o load balancer (evita 502 na AWS)', () => {
      const server = ctx.app.getHttpServer()

      expect(server.keepAliveTimeout).toBe(KEEP_ALIVE_TIMEOUT_MS)
      expect(server.keepAliveTimeout).toBeGreaterThan(60_000) // tempo ocioso padrão do ALB
      expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout)
    })

    it('não revela a tecnologia do servidor', async () => {
      const res = await ctx.api().get('/api/health/live')

      expect(res.headers).not.toHaveProperty('x-powered-by')
    })

    it('mantém o Swagger UI funcionando com a CSP', async () => {
      const res = await ctx.api().get('/api/docs/')

      expect(res.status).toBe(200)
      // A CSP só permite scripts do próprio servidor: o Swagger não pode depender de script inline
      expect(res.text).not.toMatch(/<script>[^<]+<\/script>/)
    })
  })

  describe('CORS', () => {
    it('libera a origem do site configurada', async () => {
      const res = await ctx.api().get('/api/health/live').set('Origin', 'http://localhost:5173')

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    })

    it('não libera outras origens', async () => {
      const res = await ctx.api().get('/api/health/live').set('Origin', 'https://site-qualquer.com')

      expect(res.headers).not.toHaveProperty('access-control-allow-origin')
    })

    it('responde ao preflight do navegador com os cabeçalhos que o site usa', async () => {
      const res = await ctx
        .api()
        .options('/api/patients/22916926402')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization')

      expect(res.status).toBe(204)
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(res.headers['access-control-allow-headers']).toContain('authorization')
    })
  })

  describe('Compressão', () => {
    it('comprime respostas grandes quando o cliente aceita gzip', async () => {
      const res = await ctx.api().get('/api/docs-json').set('Accept-Encoding', 'gzip')

      expect(res.status).toBe(200)
      expect(res.headers['content-encoding']).toBe('gzip')
    })

    it('não comprime quando o cliente não pede', async () => {
      const res = await ctx.api().get('/api/docs-json').set('Accept-Encoding', 'identity')

      expect(res.headers['content-encoding']).toBeUndefined()
    })
  })
})

describe('Segurança: limite de tentativas de entrada', () => {
  let ctx: TestContext
  const wrongLogin = (email: string, ip?: string) => {
    const req = ctx.api().post('/api/auth/login')
    if (ip) req.set('X-Forwarded-For', ip)
    return req.send({ email, password: 'senha-errada' })
  }

  beforeAll(async () => {
    // 1 proxy na frente, para simular clientes diferentes pelo X-Forwarded-For
    ctx = await createTestApp({ LOGIN_RATE_LIMIT: '3', LOGIN_RATE_LIMIT_IP: '6', TRUST_PROXY: '1' })
  })

  afterAll(async () => {
    await ctx?.close()
  })

  it('bloqueia com 429 quem erra a senha da mesma conta várias vezes', async () => {
    for (let i = 0; i < 3; i++) expect((await wrongLogin('medico@teste.com', '10.0.0.1')).status).toBe(401)

    const blocked = await wrongLogin('medico@teste.com', '10.0.0.1')
    expect(blocked.status).toBe(429)
    expect(blocked.body).toEqual({
      statusCode: 429,
      message: 'Muitas tentativas de entrada. Aguarde 1 minuto e tente de novo.',
    })
  })

  it('bloqueia até a senha certa enquanto durar o bloqueio', async () => {
    const res = await ctx
      .api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ email: 'medico@teste.com', password: '123456' })

    expect(res.status).toBe(429)
  })

  it('conta o e-mail sem diferenciar maiúsculas (não dá para contornar trocando a caixa)', async () => {
    const res = await wrongLogin('MEDICO@teste.com', '10.0.0.1')

    expect(res.status).toBe(429)
  })

  it('não atrapalha outro usuário que sai pelo mesmo IP', async () => {
    const res = await ctx
      .api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.1')
      .send({ email: 'gestor@teste.com', password: '123456' })

    expect(res.status).toBe(200)
  })

  it('não atrapalha a mesma conta vinda de outro IP', async () => {
    const res = await ctx
      .api()
      .post('/api/auth/login')
      .set('X-Forwarded-For', '10.0.0.2')
      .send({ email: 'medico@teste.com', password: '123456' })

    expect(res.status).toBe(200)
  })

  it('bloqueia o IP que testa muitas contas diferentes', async () => {
    const statuses = []
    for (let i = 0; i < 7; i++) statuses.push((await wrongLogin(`conta${i}@teste.com`, '10.0.0.3')).status)

    expect(statuses.slice(0, 6)).toEqual([401, 401, 401, 401, 401, 401])
    expect(statuses[6]).toBe(429)
  })

  it('também limita o login do app (CPF) e o primeiro acesso, com o CPF com ou sem máscara', async () => {
    const patientLogin = (cpf: string) =>
      ctx.api().post('/api/auth/patient-login').set('X-Forwarded-For', '10.0.0.4').send({ cpf, password: 'errada' })

    expect((await patientLogin('22916926402')).status).toBe(401)
    expect((await patientLogin('229.169.264-02')).status).toBe(401)
    expect((await patientLogin('22916926402')).status).toBe(401)
    expect((await patientLogin('229.169.264-02')).status).toBe(429)

    const register = () =>
      ctx
        .api()
        .post('/api/auth/patient-register')
        .set('X-Forwarded-For', '10.0.0.5')
        .send({ cpf: '50717927296', birthDate: '2000-01-01', password: 'senhaForte123' })
    for (let i = 0; i < 3; i++) expect((await register()).status).toBe(400)
    expect((await register()).status).toBe(429)
  })

  it('não limita as demais rotas', async () => {
    for (let i = 0; i < 10; i++) expect((await ctx.api().get('/api/health/live')).status).toBe(200)
  })
})
