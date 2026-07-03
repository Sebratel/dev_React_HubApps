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
  requireAuth:          (req, _res, next) => { req.uid = 'admin-uid'; next() },
  requireAdmin:         (_req, _res, next) => next(),
  invalidateAdminCache: jest.fn(),
  _clearCacheForTesting: jest.fn(),
}))

jest.mock('../../src/middleware/rateLimits', () => ({
  provisionLimiter:  (_req, _res, next) => next(),
  adminWriteLimiter: (_req, _res, next) => next(),
  auditLogLimiter:   (_req, _res, next) => next(),
  ssoLaunchLimiter:  (_req, _res, next) => next(),
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

// ─── POST /users/provision ────────────────────────────────────────────────────

describe('POST /users/provision', () => {
  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/users/provision')
      .set('Authorization', 'Bearer token')
      .send({ email: 'a@b.com' })
    expect(res.status).toBe(400)
  })

  it('upserts user and returns record', async () => {
    const user = { id: 'admin-uid', email: 'a@b.com', name: 'Alice', is_active: 0 }
    pool.query
      .mockResolvedValueOnce([{}])      // INSERT ... ON DUPLICATE KEY UPDATE
      .mockResolvedValueOnce([[user]])  // SELECT

    const res = await request(app)
      .post('/users/provision')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Alice', email: 'a@b.com' })

    expect(res.status).toBe(200)
    expect(res.body.email).toBe('a@b.com')

    const insertSql = pool.query.mock.calls[0][0]
    expect(insertSql).toMatch(/ON DUPLICATE KEY UPDATE/i)
    expect(insertSql).toMatch(/id = VALUES\(id\)/i)
    expect(insertSql).toMatch(/email = VALUES\(email\)/i)
  })

  it('normalizes e-mail before provision', async () => {
    const user = { id: 'admin-uid', email: 'a@b.com', name: 'Alice', is_active: 0 }
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[user]])

    await request(app)
      .post('/users/provision')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Alice', email: 'A@B.COM' })

    expect(pool.query.mock.calls[0][1][1]).toBe('a@b.com')
  })

  it('returns JSON error when provisioned user cannot be loaded', async () => {
    pool.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[]])

    const res = await request(app)
      .post('/users/provision')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Alice', email: 'a@b.com' })

    expect(res.status).toBe(500)
    expect(res.body.error).toMatch(/provisionar/)
  })
})

// ─── GET /users ───────────────────────────────────────────────────────────────

describe('GET /users', () => {
  it('returns paginated structure', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 3 }]])
      .mockResolvedValueOnce([[{ id: 'u1' }, { id: 'u2' }]])

    const res = await request(app)
      .get('/users')
      .set('Authorization', 'Bearer token')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('pagination')
    expect(res.body.pagination.total).toBe(3)
    expect(res.body.pagination.limit).toBe(50)
    expect(res.body.pagination.offset).toBe(0)
  })

  it('respects limit and offset query params', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 10 }]])
      .mockResolvedValueOnce([[]])

    await request(app)
      .get('/users?limit=5&offset=10')
      .set('Authorization', 'Bearer token')

    const selectCall = pool.query.mock.calls[1]
    expect(selectCall[1]).toEqual([5, 10])
  })

  it('caps limit at 200', async () => {
    pool.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]])

    await request(app)
      .get('/users?limit=9999')
      .set('Authorization', 'Bearer token')

    const selectCall = pool.query.mock.calls[1]
    expect(selectCall[1][0]).toBe(200)
  })
})

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────

describe('PATCH /users/:id', () => {
  it('blocks admin from changing own is_admin', async () => {
    const res = await request(app)
      .patch('/users/admin-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_admin: 0 })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/próprio is_admin/)
  })

  it('returns 400 when is_active and is_admin are in the same body', async () => {
    const res = await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 1, is_admin: 1 })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/não podem ser alterados na mesma requisição/)
  })

  it('returns 400 for no valid fields', async () => {
    const res = await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ unknown_field: 'value' })

    expect(res.status).toBe(400)
  })

  it('emits USER_PROMOTE_ADMIN when is_admin = 1', async () => {
    const updatedUser = { id: 'other-uid', name: 'Bob', is_admin: 1 }
    conn.query
      .mockResolvedValueOnce([{}])                   // UPDATE users
      .mockResolvedValueOnce([[{ name: 'Admin' }]])  // logAudit: SELECT name
      .mockResolvedValueOnce([{}])                   // logAudit: INSERT
    pool.query
      .mockResolvedValueOnce([[updatedUser]])         // SELECT for response

    const res = await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_admin: 1 })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('other-uid')
    expect(conn.query.mock.calls[2][1][3]).toBe('USER_PROMOTE_ADMIN')
    expect(conn.commit).toHaveBeenCalled()
  })

  it('emits USER_REVOKE_ADMIN when is_admin = 0', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'other-uid', is_admin: 0 }]])

    await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_admin: 0 })

    expect(conn.query.mock.calls[2][1][3]).toBe('USER_REVOKE_ADMIN')
  })

  it('emits USER_ACTIVATE when is_active = 1', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'other-uid', is_active: 1 }]])

    await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 1 })

    expect(conn.query.mock.calls[2][1][3]).toBe('USER_ACTIVATE')
  })

  it('emits USER_DEACTIVATE when is_active = 0', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'other-uid', is_active: 0 }]])

    await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 0 })

    expect(conn.query.mock.calls[2][1][3]).toBe('USER_DEACTIVATE')
  })

  it('emits USER_UPDATE when updating profile or team', async () => {
    conn.query
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ name: 'Admin' }]])
      .mockResolvedValueOnce([{}])
    pool.query
      .mockResolvedValueOnce([[{ id: 'other-uid', profile: 'manager' }]])

    await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ profile: 'manager' })

    expect(conn.query.mock.calls[2][1][3]).toBe('USER_UPDATE')
  })

  it('rolls back mutation and returns 500 when logAudit fails', async () => {
    conn.query
      .mockResolvedValueOnce([{}])                              // UPDATE users
      .mockRejectedValueOnce(new Error('audit DB error'))       // logAudit SELECT name fails

    const res = await request(app)
      .patch('/users/other-uid')
      .set('Authorization', 'Bearer token')
      .send({ is_active: 1 })

    expect(res.status).toBe(500)
    expect(conn.rollback).toHaveBeenCalled()
    expect(conn.commit).not.toHaveBeenCalled()
  })
})
