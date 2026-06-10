jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'uid-123', email: 'u@test.com' }) }),
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
}))

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }))

jest.mock('../../src/middleware/auth', () => ({
  requireAuth:          (req, _res, next) => { req.uid = 'uid-123'; next() },
  requireAdmin:         (_req, _res, next) => next(),
  invalidateAdminCache: jest.fn(),
  _clearCacheForTesting: jest.fn(),
}))

jest.mock('../../src/middleware/rateLimits', () => ({
  provisionLimiter:  (_req, _res, next) => next(),
  adminWriteLimiter: (_req, _res, next) => next(),
  auditLogLimiter:   (_req, _res, next) => next(),
}))

const request = require('supertest')
const pool    = require('../../src/db/pool')
const app     = require('../../src/index')

beforeEach(() => pool.query.mockReset())

describe('POST /audit-logs', () => {
  it('returns 400 when action is missing', async () => {
    const res = await request(app)
      .post('/audit-logs')
      .set('Authorization', 'Bearer token')
      .send({ details: 'something' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/action obrigatório/)
  })

  it('returns 400 for invalid action', async () => {
    const res = await request(app)
      .post('/audit-logs')
      .set('Authorization', 'Bearer token')
      .send({ action: 'FAKE_ACTION' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/action inválida/)
  })

  it('accepts valid action and ignores userName from body', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Real Name From DB' }]]) // logAudit SELECT name
      .mockResolvedValueOnce([{}])                              // logAudit INSERT

    const res = await request(app)
      .post('/audit-logs')
      .set('Authorization', 'Bearer token')
      .send({ action: 'LOGIN', userName: 'Hacker Name', details: null })

    expect(res.status).toBe(201)

    // userName in INSERT must come from DB, not body
    const insertArgs = pool.query.mock.calls[1][1]
    expect(insertArgs[2]).toBe('Real Name From DB')
    expect(insertArgs[2]).not.toBe('Hacker Name')
  })

  it('returns 201 with ok: true on success', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Alice' }]])
      .mockResolvedValueOnce([{}])

    const res = await request(app)
      .post('/audit-logs')
      .set('Authorization', 'Bearer token')
      .send({ action: 'APP_OPEN', details: { appId: 'app-1' } })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('GET /audit-logs/me', () => {
  it('returns paginated structure', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 7 }]])
      .mockResolvedValueOnce([[{ id: 'log1' }, { id: 'log2' }]])

    const res = await request(app)
      .get('/audit-logs/me')
      .set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(res.body.pagination.total).toBe(7)
    expect(res.body.data).toHaveLength(2)
  })
})

describe('GET /audit-logs (admin)', () => {
  it('returns 400 for invalid action filter', async () => {
    const res = await request(app)
      .get('/audit-logs?action=INVALID')
      .set('Authorization', 'Bearer token')
    expect(res.status).toBe(400)
  })

  it('filters by user_id and action', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([[]])

    await request(app)
      .get('/audit-logs?user_id=uid-abc&action=LOGIN')
      .set('Authorization', 'Bearer token')

    const countSql = pool.query.mock.calls[0][0]
    expect(countSql).toMatch(/user_id = \?/)
    expect(countSql).toMatch(/action = \?/)
  })

  it('filters by date range', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[]])

    await request(app)
      .get('/audit-logs?date_from=2026-01-01&date_to=2026-12-31')
      .set('Authorization', 'Bearer token')

    const countSql = pool.query.mock.calls[0][0]
    expect(countSql).toMatch(/created_at >= \?/)
    expect(countSql).toMatch(/created_at <= \?/)
  })
})
