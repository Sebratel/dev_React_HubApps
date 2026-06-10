jest.mock('firebase-admin', () => ({
  apps: ['mock'],
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
  credential: { cert: jest.fn() },
  initializeApp: jest.fn(),
}))

jest.mock('../../src/db/pool', () => ({ query: jest.fn() }))

// Must be var so it's accessible inside the jest.mock factory (hoisting)
var mockVerifyIdToken = jest.fn()

const pool = require('../../src/db/pool')
const { requireAuth, requireAdmin, invalidateAdminCache, _clearCacheForTesting } = require('../../src/middleware/auth')

const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
const next = jest.fn()

beforeEach(() => {
  pool.query.mockReset()
  mockVerifyIdToken.mockReset()
  next.mockReset()
  res.status.mockClear()
  res.json.mockClear()
  _clearCacheForTesting()
})

describe('requireAuth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    await requireAuth({ headers: {} }, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('invalid'))
    await requireAuth({ headers: { authorization: 'Bearer bad-token' } }, res, next)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('sets req.uid and calls next() on valid token', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'uid-abc', email: 'a@b.com' })
    const req = { headers: { authorization: 'Bearer good-token' } }
    await requireAuth(req, res, next)
    expect(req.uid).toBe('uid-abc')
    expect(next).toHaveBeenCalled()
  })
})

describe('requireAdmin', () => {
  it('returns 403 for non-admin user', async () => {
    pool.query.mockResolvedValueOnce([[{ is_admin: 0 }]])
    await requireAdmin({ uid: 'uid-1' }, res, next)
    expect(res.status).toHaveBeenCalledWith(403)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() for admin user', async () => {
    pool.query.mockResolvedValueOnce([[{ is_admin: 1 }]])
    await requireAdmin({ uid: 'uid-2' }, res, next)
    expect(next).toHaveBeenCalled()
  })

  it('uses cache on second call (no extra DB query)', async () => {
    pool.query.mockResolvedValueOnce([[{ is_admin: 1 }]])
    await requireAdmin({ uid: 'uid-3' }, res, next)
    await requireAdmin({ uid: 'uid-3' }, res, next)
    expect(pool.query).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('invalidateAdminCache forces re-query', async () => {
    pool.query
      .mockResolvedValueOnce([[{ is_admin: 1 }]])
      .mockResolvedValueOnce([[{ is_admin: 0 }]])

    await requireAdmin({ uid: 'uid-4' }, res, next)
    invalidateAdminCache('uid-4')
    await requireAdmin({ uid: 'uid-4' }, res, next)

    expect(pool.query).toHaveBeenCalledTimes(2)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
