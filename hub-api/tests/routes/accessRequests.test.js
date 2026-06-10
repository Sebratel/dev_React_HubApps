jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin-uid', email: 'a@test.com' }) }),
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

// ─── POST /access-requests ────────────────────────────────────────────────────

describe('POST /access-requests', () => {
  it('returns 400 when appId is missing', async () => {
    const res = await request(app)
      .post('/access-requests')
      .set('Authorization', 'Bearer token')
      .send({ appName: 'App X' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when app is inactive or not found', async () => {
    pool.query.mockResolvedValueOnce([[]])  // app not found
    const res = await request(app)
      .post('/access-requests')
      .set('Authorization', 'Bearer token')
      .send({ appId: 'app-x', appName: 'App X' })
    expect(res.status).toBe(404)
  })

  it('creates request and emits ACCESS_REQUEST_CREATE', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 'app-1' }]])  // SELECT app (before transaction)

    conn.query
      .mockResolvedValueOnce([{}])                  // INSERT access_request
      .mockResolvedValueOnce([[{ name: 'User' }]])  // logAudit: SELECT name
      .mockResolvedValueOnce([{}])                  // logAudit: INSERT

    const res = await request(app)
      .post('/access-requests')
      .set('Authorization', 'Bearer token')
      .send({ appId: 'app-1', appName: 'App X', reason: 'Need access' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(conn.query.mock.calls[2][1][3]).toBe('ACCESS_REQUEST_CREATE')
    expect(conn.commit).toHaveBeenCalled()
  })

  it('rolls back and returns 500 when logAudit fails', async () => {
    pool.query
      .mockResolvedValueOnce([[{ id: 'app-1' }]])  // SELECT app

    conn.query
      .mockResolvedValueOnce([{}])                              // INSERT succeeds
      .mockRejectedValueOnce(new Error('audit DB error'))       // logAudit SELECT name fails

    const res = await request(app)
      .post('/access-requests')
      .set('Authorization', 'Bearer token')
      .send({ appId: 'app-1', appName: 'App X' })

    expect(res.status).toBe(500)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})

// ─── GET /access-requests/me ──────────────────────────────────────────────────

describe('GET /access-requests/me', () => {
  it('returns paginated structure', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 4 }]])
      .mockResolvedValueOnce([[{ id: 'req-1' }]])

    const res = await request(app)
      .get('/access-requests/me')
      .set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(res.body.pagination.total).toBe(4)
  })
})

// ─── GET /access-requests (admin) ─────────────────────────────────────────────

describe('GET /access-requests (admin)', () => {
  it('returns 400 for invalid status filter', async () => {
    const res = await request(app)
      .get('/access-requests?status=invalid')
      .set('Authorization', 'Bearer token')
    expect(res.status).toBe(400)
  })

  it('filters by status, app_id and user_id', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 1 }]])
      .mockResolvedValueOnce([[]])

    await request(app)
      .get('/access-requests?status=pending&app_id=app-1&user_id=u-1')
      .set('Authorization', 'Bearer token')

    const countSql = pool.query.mock.calls[0][0]
    expect(countSql).toMatch(/status = \?/)
    expect(countSql).toMatch(/app_id = \?/)
    expect(countSql).toMatch(/user_id = \?/)
  })
})

// ─── PATCH /access-requests/:id ───────────────────────────────────────────────

describe('PATCH /access-requests/:id', () => {
  it('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'maybe' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when request not found', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'approved' })
    expect(res.status).toBe(404)
  })

  it('returns 409 when request is already processed', async () => {
    pool.query.mockResolvedValueOnce([[{
      id: 'req-1', status: 'approved', user_id: 'u1', app_id: 'a1', app_name: 'App',
    }]])
    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'approved' })
    expect(res.status).toBe(409)
  })

  it('approves pending request and emits ACCESS_REQUEST_APPROVE', async () => {
    const existing = { id: 'req-1', status: 'pending', user_id: 'u-1', app_id: 'app-1', app_name: 'App X' }
    pool.query
      .mockResolvedValueOnce([[existing]])                               // SELECT existing
      .mockResolvedValueOnce([[{ ...existing, status: 'approved' }]])   // SELECT for response

    conn.query
      .mockResolvedValueOnce([{}])                        // UPDATE
      .mockResolvedValueOnce([[{ name: 'Admin' }]])       // logAudit: SELECT name
      .mockResolvedValueOnce([{}])                        // logAudit: INSERT

    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'approved' })

    expect(res.status).toBe(200)
    expect(conn.query.mock.calls[2][1][3]).toBe('ACCESS_REQUEST_APPROVE')
    expect(conn.commit).toHaveBeenCalled()
  })

  it('rejects pending request and emits ACCESS_REQUEST_REJECT', async () => {
    const existing = { id: 'req-1', status: 'pending', user_id: 'u-1', app_id: 'app-1', app_name: 'App X' }
    pool.query
      .mockResolvedValueOnce([[existing]])
      .mockResolvedValueOnce([[{ ...existing, status: 'rejected' }]])

    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])

    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'rejected' })

    expect(res.status).toBe(200)
    expect(conn.query.mock.calls[2][1][3]).toBe('ACCESS_REQUEST_REJECT')
  })

  it('rolls back and returns 500 when logAudit fails', async () => {
    const existing = { id: 'req-1', status: 'pending', user_id: 'u-1', app_id: 'app-1', app_name: 'App X' }
    pool.query.mockResolvedValueOnce([[existing]])  // SELECT existing

    conn.query
      .mockResolvedValueOnce([{}])                              // UPDATE succeeds
      .mockRejectedValueOnce(new Error('audit DB error'))       // logAudit SELECT name fails

    const res = await request(app)
      .patch('/access-requests/req-1')
      .set('Authorization', 'Bearer token')
      .send({ status: 'approved' })

    expect(res.status).toBe(500)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})
