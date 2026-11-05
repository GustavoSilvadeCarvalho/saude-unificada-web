import { createTestApp, type TestContext } from './helpers.js'

describe('Saúde da API', () => {
  let ctx: TestContext

  beforeAll(async () => {
    ctx = await createTestApp()
  })

  afterAll(async () => {
    await ctx?.close()
  })

  it('GET /api/health responde 200 com o MongoDB no ar, sem precisar de token', async () => {
    const res = await ctx.api().get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', mongodb: 'up' })
    expect(typeof res.body.uptimeSeconds).toBe('number')
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp)
  })

  it('GET /api/health/live responde 200', async () => {
    const res = await ctx.api().get('/api/health/live')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('serve o Swagger UI em /api/docs e o JSON em /api/docs-json', async () => {
    const ui = await ctx.api().get('/api/docs/')
    expect(ui.status).toBe(200)
    expect(ui.text).toContain('swagger')

    const json = await ctx.api().get('/api/docs-json')
    expect(json.status).toBe(200)
    expect(json.body.paths).toHaveProperty('/api/auth/login')
  })

  // Por último: derruba o banco de propósito
  it('GET /api/health responde 503 quando o MongoDB cai, e o /live continua 200', async () => {
    await ctx.replSet.stop()

    const res = await ctx.api().get('/api/health')
    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ status: 'erro', mongodb: 'down' })

    const live = await ctx.api().get('/api/health/live')
    expect(live.status).toBe(200)
  })
})
