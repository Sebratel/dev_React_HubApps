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

const BASE_TEAM = {
  id: 'team-1', name: 'Infraestrutura', description: 'Time de infra',
  is_active: 1, member_count: 3,
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

describe('GET /teams', () => {
  it('retorna times ativos', async () => {
    pool.query.mockResolvedValueOnce([[BASE_TEAM]])
    const res = await request(app).get('/teams').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Infraestrutura')
  })
})

describe('GET /teams/all', () => {
  it('retorna todos os times incluindo inativos (admin)', async () => {
    pool.query.mockResolvedValueOnce([[BASE_TEAM, { ...BASE_TEAM, id: 'team-2', is_active: 0 }]])
    const res = await request(app).get('/teams/all').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /teams', () => {
  it('cria time com sucesso', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])  // INSERT
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])  // logAudit
    pool.query.mockResolvedValueOnce([[BASE_TEAM]])           // SELECT com member_count
    const res = await request(app)
      .post('/teams')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Infraestrutura', description: 'Time de infra' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Infraestrutura')
  })

  it('rejeita sem name', async () => {
    const res = await request(app)
      .post('/teams')
      .set('Authorization', 'Bearer tok')
      .send({ description: 'sem nome' })
    expect(res.status).toBe(400)
  })

  it('retorna 409 para nome duplicado', async () => {
    const dupErr = new Error('ER_DUP_ENTRY')
    dupErr.code = 'ER_DUP_ENTRY'
    conn.query.mockRejectedValueOnce(dupErr)
    const res = await request(app)
      .post('/teams')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Infraestrutura' })
    expect(res.status).toBe(409)
  })
})

describe('PATCH /teams/:id', () => {
  it('atualiza time com sucesso', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[BASE_TEAM]])
    const res = await request(app)
      .patch('/teams/team-1')
      .set('Authorization', 'Bearer tok')
      .send({ description: 'Nova descrição' })
    expect(res.status).toBe(200)
  })

  it('rejeita sem campos válidos', async () => {
    const res = await request(app)
      .patch('/teams/team-1')
      .set('Authorization', 'Bearer tok')
      .send({ foo: 'bar' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /teams/:id', () => {
  it('desativa time com sucesso', async () => {
    pool.query.mockResolvedValueOnce([[{ id: 'team-1' }]])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    const res = await request(app)
      .delete('/teams/team-1')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(204)
  })

  it('retorna 404 para time inexistente', async () => {
    pool.query.mockResolvedValueOnce([[]])
    const res = await request(app)
      .delete('/teams/nonexistent')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(404)
  })
})
