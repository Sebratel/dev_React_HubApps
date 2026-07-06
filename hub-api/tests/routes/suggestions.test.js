jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-uid', email: 'user@test.com' }) }),
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
const conn    = pool._conn
const app     = require('../../src/index')

const BASE_RAW = {
  id: 1,
  app_id: 'app-1',
  app_name: 'Listagem Splitters',
  sector: 'COR',
  user_id: 'user-uid',
  user_name: 'Usuário Teste',
  title: 'Minha sugestão',
  body: 'Detalhes',
  category: 'Funcionalidade',
  legacy_status: 'open',
  admin_note: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  up_count: 0,
  down_count: 0,
  score: 0,
  comment_count: 0,
  my_vote: null,
  up_voter_names: null,
}

const BASE_USER = { name: 'Usuário Teste', email: 'user@test.com', photo_url: null, is_active: 1 }

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

describe('GET /suggestions/sectors', () => {
  it('retorna lista de setores', async () => {
    pool.query.mockResolvedValueOnce([[{ sector: 'COR' }, { sector: 'Suporte Técnico' }]])
    const res = await request(app).get('/suggestions/sectors').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toContain('COR')
    expect(res.body).toContain('Suporte Técnico')
  })
})

describe('GET /suggestions', () => {
  it('retorna sugestões do usuário logado', async () => {
    pool.query.mockResolvedValueOnce([[BASE_RAW]])
    const res = await request(app).get('/suggestions').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].title).toBe('Minha sugestão')
    expect(res.body[0].id).toBe('1')
    expect(res.body[0].status).toBe('pending')
    expect(res.body[0].type).toBe('feature')
  })

  it('filtra por appId quando informado', async () => {
    pool.query.mockResolvedValueOnce([[BASE_RAW]])
    const res = await request(app)
      .get('/suggestions?appId=app-1')
      .set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(pool.query.mock.calls[0][1]).toEqual(['user-uid', 'app-1'])
  })
})

describe('GET /suggestions/all', () => {
  it('retorna todas as sugestões (admin)', async () => {
    pool.query.mockResolvedValueOnce([[BASE_RAW, { ...BASE_RAW, id: 2, user_id: 'other-uid' }]])
    const res = await request(app).get('/suggestions/all').set('Authorization', 'Bearer tok')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
  })
})

describe('POST /suggestions', () => {
  it('cria sugestão com sucesso', async () => {
    pool.query.mockResolvedValueOnce([[BASE_USER]])
    pool.query.mockResolvedValueOnce([[{ id: 'app-1', name: 'Listagem Splitters' }]])
    conn.query.mockResolvedValueOnce([{ insertId: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[BASE_RAW]])

    const res = await request(app)
      .post('/suggestions')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Minha sugestão', type: 'feature', sector: 'COR', appId: 'app-1', appName: 'Listagem Splitters' })

    expect(res.status).toBe(201)
    expect(res.body.title).toBe('Minha sugestão')
    expect(conn.query.mock.calls[0][0]).toMatch(/INSERT INTO platform_suggestions/i)
    expect(conn.query.mock.calls[0][1][2]).toBe('COR')
    expect(conn.query.mock.calls[0][1][3]).toBe('app-1')
  })

  it('rejeita sem sector', async () => {
    pool.query.mockResolvedValueOnce([[BASE_USER]])
    const res = await request(app)
      .post('/suggestions')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Teste', type: 'feature' })
    expect(res.status).toBe(400)
  })

  it('rejeita sem title', async () => {
    pool.query.mockResolvedValueOnce([[BASE_USER]])
    const res = await request(app)
      .post('/suggestions')
      .set('Authorization', 'Bearer tok')
      .send({ type: 'feature' })
    expect(res.status).toBe(400)
  })

  it('rejeita usuário inativo', async () => {
    pool.query.mockResolvedValueOnce([[{ ...BASE_USER, is_active: 0 }]])
    const res = await request(app)
      .post('/suggestions')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Teste' })
    expect(res.status).toBe(403)
  })

  it('aceita type inválido como "other"', async () => {
    pool.query.mockResolvedValueOnce([[BASE_USER]])
    conn.query.mockResolvedValueOnce([{ insertId: 2 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[{ ...BASE_RAW, id: 2, category: 'Outro' }]])

    const res = await request(app)
      .post('/suggestions')
      .set('Authorization', 'Bearer tok')
      .send({ title: 'Teste', type: 'invalid_type', sector: 'COR' })

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('other')
  })
})

describe('PATCH /suggestions/:id/status', () => {
  it('atualiza status com sucesso', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    conn.query.mockResolvedValueOnce([{ affectedRows: 1 }])
    pool.query.mockResolvedValueOnce([[{ ...BASE_RAW, legacy_status: 'done' }]])

    const res = await request(app)
      .patch('/suggestions/1/status')
      .set('Authorization', 'Bearer tok')
      .send({ status: 'done', adminNote: 'Implementado na v2!' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('done')
    expect(conn.query.mock.calls[0][0]).toMatch(/UPDATE platform_suggestions/i)
  })

  it('rejeita status inválido', async () => {
    const res = await request(app)
      .patch('/suggestions/1/status')
      .set('Authorization', 'Bearer tok')
      .send({ status: 'aprovado' })
    expect(res.status).toBe(400)
  })

  it('retorna 404 se sugestão não existe', async () => {
    conn.query.mockResolvedValueOnce([{ affectedRows: 0 }])
    const res = await request(app)
      .patch('/suggestions/999/status')
      .set('Authorization', 'Bearer tok')
      .send({ status: 'done' })
    expect(res.status).toBe(404)
  })
})
