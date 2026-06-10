const AUDIT_ACTIONS = require('../../src/utils/auditActions')

describe('AUDIT_ACTIONS', () => {
  it('contains all expected actions', () => {
    const expected = [
      'LOGIN', 'LOGOUT', 'APP_OPEN',
      'USER_UPDATE', 'USER_ACTIVATE', 'USER_DEACTIVATE',
      'USER_PROMOTE_ADMIN', 'USER_REVOKE_ADMIN',
      'APP_CREATE', 'APP_UPDATE', 'APP_DEACTIVATE', 'APP_REACTIVATE',
      'ACCESS_REQUEST_CREATE', 'ACCESS_REQUEST_APPROVE', 'ACCESS_REQUEST_REJECT',
    ]
    expect(Object.keys(AUDIT_ACTIONS)).toEqual(expect.arrayContaining(expected))
    expect(Object.keys(AUDIT_ACTIONS)).toHaveLength(expected.length)
  })

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(AUDIT_ACTIONS)).toBe(true)
  })

  it('values equal their keys', () => {
    Object.entries(AUDIT_ACTIONS).forEach(([k, v]) => expect(k).toBe(v))
  })
})
