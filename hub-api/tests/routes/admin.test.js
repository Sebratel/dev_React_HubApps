jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin-uid', email: 'admin@test.com' }) }),
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
}))

jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  getConnection: jest.fn(),
}))

jest.mock('../../src/middleware/auth', () => ({
  requireAuth:           (req, _res, next) => { req.uid = 'admin-uid'; next() },
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

beforeEach(() => {
  pool.query.mockReset()
})

describe('GET /admin/stats', () => {
  it('retorna estrutura completa de stats', async () => {
    pool.query
      .mockResolvedValueOnce([[{ profile: 'infraestrutura', count: 5 }, { profile: 'tecnica', count: 3 }]])
      .mockResolvedValueOnce([[{ app_name: 'GER', open_count: 42 }, { app_name: 'Hub', open_count: 10 }]])
      .mockResolvedValueOnce([[{ count: 2 }]])
      .mockResolvedValueOnce([[{ active: 4, total: 5 }]])
      .mockResolvedValueOnce([[{ active: 3, total: 4 }]])

    const res = await request(app).get('/admin/stats').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      profileDistribution: expect.arrayContaining([
        { profile: 'infraestrutura', count: 5 },
        { profile: 'tecnica', count: 3 },
      ]),
      topApps: expect.arrayContaining([
        { appName: 'GER', openCount: 42 },
      ]),
      pendingSuggestions: 2,
      teams:         { active: 4, total: 5 },
      announcements: { active: 3, total: 4 },
    })
  })

  it('retorna arrays vazios quando não há dados', async () => {
    pool.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ count: 0 }]])
      .mockResolvedValueOnce([[{ active: null, total: 0 }]])
      .mockResolvedValueOnce([[{ active: null, total: 0 }]])

    const res = await request(app).get('/admin/stats').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body.profileDistribution).toHaveLength(0)
    expect(res.body.topApps).toHaveLength(0)
    expect(res.body.pendingSuggestions).toBe(0)
    expect(res.body.teams.active).toBe(0)
    expect(res.body.announcements.active).toBe(0)
  })
})
