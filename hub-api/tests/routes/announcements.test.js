jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin-uid', email: 'admin@test.com' }) }),
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
}))

jest.mock('../../src/db/pool', () => {
  const conn = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query:            jest.fn(),
    commit:           jest.fn().mockResolvedValue(undefined),
    rollback:         jest.fn().mockResolvedValue(undefined),
    release:          jest.fn(),
  }
  return {
    query:         jest.fn(),
    getConnection: jest.fn().mockResolvedValue(conn),
    _conn:         conn,
  }
})

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
const conn    = pool._conn
const app     = require('../../src/index')

const BASE_ANNO = {
  id: 'anno-1', title: 'Aviso teste', body: 'Corpo do aviso', type: 'info',
  is_active: 1, created_by: 'admin-uid', allowed_profiles: '[]',
  created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  pool.query.mockReset()
  pool.getConnection.mockReset()
  pool.getConnection.mockResolvedValue(conn)
  conn.query.mockReset()
  conn.beginTransaction.mockReset().mockResolvedValue(undefined)
  conn.commit.mockReset().mockResolvedValue(undefined)
  conn.rollback.mockReset().mockResolvedValue(undefined)
  conn.release.mockReset()
})

describe('GET /announcements', () => {
  it('retorna avisos visíveis ao usuário', async () => {
    pool.query
      .mockResolvedValueOnce([[{ profile: 'tecnica', is_active: 1 }]])    // user lookup
      .mockResolvedValueOnce([[BASE_ANNO]])                                // announcements
    const res = await request(app)
      .get('/announcements')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('retorna [] para usuário inativo', async () => {
    pool.query.mockResolvedValueOnce([[{ profile: 'tecnica', is_active: 0 }]])
    const res = await request(app)
      .get('/announcements')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('GET /announcements/all', () => {
  it('retorna todos os avisos (admin)', async () => {
    pool.query.mockResolvedValueOnce([[BASE_ANNO, { ...BASE_ANNO, id: 'anno-2', is_active: 0 }]])
    const res = await request(app)
      .get('/announcements/all')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /announcements', () => {
  it('cria aviso com sucesso', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])           // INSERT
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])           // logAudit INSERT
    pool.query.mockResolvedValueOnce([[BASE_ANNO]])                    // SELECT após create
    const res = await request(app)
      .post('/announcements')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Aviso teste', type: 'info' })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Aviso teste')
  })

  it('rejeita request sem title', async () => {
    const res = await request(app)
      .post('/announcements')
      .set('Authorization', 'Bearer tok')
      .send({ body: 'sem título' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/title/)
  })
})

describe('PATCH /announcements/:id', () => {
  it('atualiza aviso com sucesso', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[BASE_ANNO]])
    const res = await request(app)
      .patch('/announcements/anno-1')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Novo título' })
    expect(res.status).toBe(200)
  })

  it('rejeita sem campos válidos', async () => {
    const res = await request(app)
      .patch('/announcements/anno-1')
      .set('Authorization', 'Bearer tok')
      .send({ foo: 'bar' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /announcements/:id', () => {
  it('desativa aviso com sucesso', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 'anno-1' }]])           // exists check
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])           // UPDATE is_active=0
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])           // logAudit
    const res = await request(app)
      .delete('/announcements/anno-1')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(204)
  })

  it('retorna 404 para aviso inexistente', async () => {
    pool.query.mockResolvedValueOnce([[]])                             // not found
    const res = await request(app)
      .delete('/announcements/nonexistent')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(404)
  })
})
