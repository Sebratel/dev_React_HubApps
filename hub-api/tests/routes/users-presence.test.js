jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-uid', email: 'user@test.com' }) }),
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
}))

jest.mock('../../src/db/pool', () => ({
  query:         jest.fn(),
  getConnection: jest.fn(),
}))

jest.mock('../../src/middleware/auth', () => ({
  requireAuth:           (req, _res, next) => { req.uid = 'user-uid'; next() },
  requireAdmin:          (_req, _res, next) => next(),
  invalidateAdminCache:  jest.fn(),
  _clearCacheForTesting: jest.fn(),
}))

jest.mock('../../src/middleware/rateLimits', () => ({
  provisionLimiter:  (_req, _res, next) => next(),
  adminWriteLimiter: (_req, _res, next) => next(),
  auditLogLimiter:   (_req, _res, next) => next(),
  ssoLaunchLimiter:  (_req, _res, next) => next(),
}))

jest.mock('../../src/utils/logAudit', () => jest.fn().mockResolvedValue(undefined))

const request = require('supertest')
const pool    = require('../../src/db/pool')
const app     = require('../../src/index')

const ONLINE_USER = {
  id: 'user-uid', name: 'Usuário Online', email: 'online@test.com',
  photo_url: null, profile: 'infraestrutura', team: null,
  is_active: 1, is_admin: 0,
  last_login: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  last_heartbeat: '2026-06-11T19:00:00.000Z',
}

beforeEach(() => {
  pool.query.mockReset()
})

describe('PATCH /users/me/heartbeat', () => {
  it('atualiza heartbeat do usuário autenticado', async () => {
    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = await request(app)
      .patch('/users/me/heartbeat')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})

describe('GET /users/online', () => {
  it('retorna usuários com heartbeat recente (admin)', async () => {
    pool.query.mockResolvedValueOnce([[ONLINE_USER]])
    const res = await request(app)
      .get('/users/online')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Usuário Online')
    expect(res.body[0].last_heartbeat).toBeDefined()
  })

  it('retorna lista vazia quando ninguém está online', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = await request(app)
      .get('/users/online')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })
})
