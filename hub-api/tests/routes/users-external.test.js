// Mock firebase-admin expondo authMock para testes controlarem createUser/deleteUser
jest.mock('firebase-admin', () => {
  const authMock = {
    verifyIdToken: jest.fn().mockResolvedValue({ uid: 'admin-uid', email: 'admin@test.com' }),
    createUser:    jest.fn(),
    deleteUser:    jest.fn().mockResolvedValue(undefined),
  }
  return {
    apps:          ['mock'],
    auth:          () => authMock,
    credential:    { cert: jest.fn() },
    initializeApp: jest.fn(),
    _authMock:     authMock,
  }
})

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
const admin   = require('firebase-admin')
const pool    = require('../../src/db/pool')
const conn    = pool._conn
const app     = require('../../src/index')

const authMock = admin._authMock

const BASE_USER = {
  id: 'new-firebase-uid', email: 'externo@empresa.com', name: 'Usuário Externo',
  photo_url: null, profile: 'users', team: null,
  is_active: 1, is_admin: 0,
  last_login: null, created_at: '2026-01-01T00:00:00.000Z',
}

beforeEach(() => {
  pool.query.mockReset()
  pool.getConnection.mockReset().mockResolvedValue(conn)
  conn.query.mockReset()
  conn.beginTransaction.mockReset().mockResolvedValue(undefined)
  conn.commit.mockReset().mockResolvedValue(undefined)
  conn.rollback.mockReset().mockResolvedValue(undefined)
  conn.release.mockReset()
  authMock.createUser.mockReset()
  authMock.deleteUser.mockReset().mockResolvedValue(undefined)
})

describe('POST /users/create-external', () => {
  it('cria usuário externo com sucesso', async () => {
    authMock.createUser.mockResolvedValueOnce({ uid: 'new-firebase-uid' })
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])  // INSERT users
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])  // logAudit
    pool.query.mockResolvedValueOnce([[BASE_USER]])           // SELECT de retorno

    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Usuário Externo', email: 'externo@empresa.com', password: 'senha123', profile: 'users' })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('externo@empresa.com')
    expect(authMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'externo@empresa.com', password: 'senha123' })
    )
  })

  it('rejeita sem name', async () => {
    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ email: 'test@test.com', password: 'senha123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/name/i)
  })

  it('rejeita sem email', async () => {
    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Teste', password: 'senha123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/email/i)
  })

  it('rejeita senha com menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Teste', email: 'test@test.com', password: '123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/6/i)
  })

  it('retorna 409 quando e-mail já existe no Firebase', async () => {
    const dupErr = Object.assign(new Error('Email already exists'), { code: 'auth/email-already-exists' })
    authMock.createUser.mockRejectedValueOnce(dupErr)

    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Teste', email: 'existente@empresa.com', password: 'senha123' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/e-mail/i)
  })

  it('faz cleanup no Firebase se INSERT MySQL falhar', async () => {
    authMock.createUser.mockResolvedValueOnce({ uid: 'new-firebase-uid' })
    const dbErr = new Error('DB error')
    conn.query.mockRejectedValueOnce(dbErr)

    const res = await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Teste', email: 'test@test.com', password: 'senha123' })

    expect(res.status).toBe(500)
    expect(authMock.deleteUser).toHaveBeenCalledWith('new-firebase-uid')
  })

  it('normaliza e-mail para lowercase', async () => {
    authMock.createUser.mockResolvedValueOnce({ uid: 'new-firebase-uid' })
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[BASE_USER]])

    await request(app)
      .post('/users/create-external')
      .set('Authorization', 'Bearer tok')
      .send({ name: 'Teste', email: 'TESTE@EMPRESA.COM', password: 'senha123' })

    expect(authMock.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'teste@empresa.com' })
    )
  })
})
