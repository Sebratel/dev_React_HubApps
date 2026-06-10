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
}))

const request = require('supertest')
const pool    = require('../../src/db/pool')
const conn    = pool._conn
const app     = require('../../src/index')

beforeEach(() => {
  pool.query.mockReset()
  pool.getConnection.mockReset()
  pool.getConnection.mockResolvedValue(conn)
  conn.query.mockReset()
  conn.beginTransaction.mockReset()
  conn.beginTransaction.mockResolvedValue(undefined)
  conn.commit.mockReset()
  conn.commit.mockResolvedValue(undefined)
  conn.rollback.mockReset()
  conn.rollback.mockResolvedValue(undefined)
  conn.release.mockReset()
})

// ─── POST /apps ───────────────────────────────────────────────────────────────

describe('POST /apps', () => {
  it('returns 400 when name or url is missing', async () => {
    const res = await request(app)
      .post('/apps')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Portal RH' })   // url missing
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/url obrigatórios/)
  })

  it('creates app and emits APP_CREATE audit log', async () => {
    const newApp = { id: 'app-new', name: 'Portal RH', url: 'https://rh.sebratel.com.br' }
    conn.query
      .mockResolvedValueOnce([{}])                   // INSERT INTO apps
      .mockResolvedValueOnce([[{ name: 'Admin' }]])  // logAudit: SELECT name
      .mockResolvedValueOnce([{}])                   // logAudit: INSERT
    pool.query
      .mockResolvedValueOnce([[newApp]])              // SELECT for response

    const res = await request(app)
      .post('/apps')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Portal RH', url: 'https://rh.sebratel.com.br' })

    expect(res.status).toBe(201)
    expect(conn.query.mock.calls[2][1][3]).toBe('APP_CREATE')
    expect(conn.commit).toHaveBeenCalled()
  })

  it('records appId and name in audit details', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query.mockResolvedValueOnce([[{ id: 'app-x', name: 'App X' }]])

    await request(app)
      .post('/apps')
      .set('Authorization', 'Bearer token')
      .send({ name: 'App X', url: 'https://x.com' })

    const auditDetails = JSON.parse(conn.query.mock.calls[2][1][4])
    expect(auditDetails).toHaveProperty('appId')
    expect(auditDetails.name).toBe('App X')
  })

  it('rolls back and returns 500 when logAudit fails', async () => {
    conn.query
      .mockResolvedValueOnce([{}])                              // INSERT apps succeeds
      .mockRejectedValueOnce(new Error('audit DB error'))       // logAudit SELECT name fails

    const res = await request(app)
      .post('/apps')
      .set('Authorization', 'Bearer token')
      .send({ name: 'App X', url: 'https://x.com' })

    expect(res.status).toBe(500)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})

// ─── PATCH /apps/:id ──────────────────────────────────────────────────────────

describe('PATCH /apps/:id', () => {
  it('returns 400 for no valid fields', async () => {
    const res = await request(app)
      .patch('/apps/app-1')
      .set('Authorization', 'Bearer token')
      .send({ unknown_field: 'value' })
    expect(res.status).toBe(400)
  })

  it('emits APP_UPDATE when updating name or url', async () => {
    const updatedApp = { id: 'app-1', name: 'Portal RH v2' }
    conn.query
      .mockResolvedValueOnce([{}])                   // UPDATE apps
      .mockResolvedValueOnce([[{ name: 'Admin' }]])  // logAudit: SELECT name
      .mockResolvedValueOnce([{}])                   // logAudit: INSERT
    pool.query
      .mockResolvedValueOnce([[updatedApp]])          // SELECT for response

    const res = await request(app)
      .patch('/apps/app-1')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Portal RH v2' })

    expect(res.status).toBe(200)
    expect(conn.query.mock.calls[2][1][3]).toBe('APP_UPDATE')
    expect(conn.commit).toHaveBeenCalled()
  })

  it('emits APP_DEACTIVATE when is_active = 0', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'app-1', is_active: 0 }]])

    await request(app)
      .patch('/apps/app-1')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 0 })

    expect(conn.query.mock.calls[2][1][3]).toBe('APP_DEACTIVATE')
  })

  it('emits APP_REACTIVATE when is_active = 1', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'app-1', is_active: 1 }]])

    await request(app)
      .patch('/apps/app-1')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 1 })

    expect(conn.query.mock.calls[2][1][3]).toBe('APP_REACTIVATE')
  })

  it('rolls back and returns 500 when logAudit fails', async () => {
    conn.query
      .mockResolvedValueOnce([{}])                              // UPDATE apps succeeds
      .mockRejectedValueOnce(new Error('audit DB error'))       // logAudit SELECT name fails

    const res = await request(app)
      .patch('/apps/app-1')
      .set('Authorization', 'Bearer token')
      .send({ name: 'New Name' })

    expect(res.status).toBe(500)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})
