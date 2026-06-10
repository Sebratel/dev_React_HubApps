jest.mock('../../src/db/pool', () => ({ query: jest.fn() }))

const pool      = require('../../src/db/pool')
const logAudit  = require('../../src/utils/logAudit')

const mockReq = { headers: { 'x-forwarded-for': '10.0.0.1' }, socket: {} }

beforeEach(() => pool.query.mockReset())

describe('logAudit()', () => {
  it('throws for an invalid action', async () => {
    await expect(
      logAudit({ uid: 'u1', action: 'INVALID_ACTION', details: null, req: mockReq })
    ).rejects.toThrow('ação inválida')
  })

  it('fetches userName from DB, not from caller', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Alice Sebratel' }]]) // SELECT name
      .mockResolvedValueOnce([{}])                            // INSERT

    await logAudit({ uid: 'u1', action: 'LOGIN', details: null, req: mockReq })

    const insertCall = pool.query.mock.calls[1]
    expect(insertCall[1][2]).toBe('Alice Sebratel') // user_name param
  })

  it('uses empty string when user not found', async () => {
    pool.query
      .mockResolvedValueOnce([[]])  // user not found
      .mockResolvedValueOnce([{}])

    await logAudit({ uid: 'ghost', action: 'LOGIN', details: null, req: mockReq })

    const insertCall = pool.query.mock.calls[1]
    expect(insertCall[1][2]).toBe('')
  })

  it('stores details as JSON string when object', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Bob' }]])
      .mockResolvedValueOnce([{}])

    await logAudit({ uid: 'u2', action: 'APP_OPEN', details: { appId: 'app-1' }, req: mockReq })

    const insertCall = pool.query.mock.calls[1]
    expect(insertCall[1][4]).toBe(JSON.stringify({ appId: 'app-1' }))
  })

  it('stores null details as null', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Bob' }]])
      .mockResolvedValueOnce([{}])

    await logAudit({ uid: 'u2', action: 'LOGOUT', details: null, req: mockReq })

    const insertCall = pool.query.mock.calls[1]
    expect(insertCall[1][4]).toBeNull()
  })

  it('extracts IP from x-forwarded-for header', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Carol' }]])
      .mockResolvedValueOnce([{}])

    await logAudit({ uid: 'u3', action: 'LOGIN', details: null, req: mockReq })

    const insertCall = pool.query.mock.calls[1]
    expect(insertCall[1][5]).toBe('10.0.0.1')
  })

  it('generates a UUID as id', async () => {
    pool.query
      .mockResolvedValueOnce([[{ name: 'Dave' }]])
      .mockResolvedValueOnce([{}])

    await logAudit({ uid: 'u4', action: 'LOGIN', details: null, req: mockReq })

    const id = pool.query.mock.calls[1][1][0]
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('uses provided conn instead of pool when given', async () => {
    const mockConn = {
      query: jest.fn()
        .mockResolvedValueOnce([[{ name: 'Eve' }]])  // SELECT name
        .mockResolvedValueOnce([{}]),                  // INSERT
    }

    await logAudit({ uid: 'u5', action: 'LOGIN', details: null, req: mockReq, conn: mockConn })

    expect(pool.query).not.toHaveBeenCalled()
    expect(mockConn.query).toHaveBeenCalledTimes(2)
  })
})
