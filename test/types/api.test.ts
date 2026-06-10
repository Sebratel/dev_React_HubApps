/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { AUDIT_ACTION, ApiError, type AuditAction } from '@/types/api'

describe('AUDIT_ACTION', () => {
  it('contains all 15 expected actions', () => {
    const expected: AuditAction[] = [
      'LOGIN', 'LOGOUT', 'APP_OPEN',
      'USER_UPDATE', 'USER_ACTIVATE', 'USER_DEACTIVATE',
      'USER_PROMOTE_ADMIN', 'USER_REVOKE_ADMIN',
      'APP_CREATE', 'APP_UPDATE', 'APP_DEACTIVATE', 'APP_REACTIVATE',
      'ACCESS_REQUEST_CREATE', 'ACCESS_REQUEST_APPROVE', 'ACCESS_REQUEST_REJECT',
    ]
    expect(Object.values(AUDIT_ACTION)).toEqual(expect.arrayContaining(expected))
    expect(Object.values(AUDIT_ACTION)).toHaveLength(15)
  })

  it('values equal their keys', () => {
    for (const [k, v] of Object.entries(AUDIT_ACTION)) {
      expect(k).toBe(v)
    }
  })
})

describe('ApiError', () => {
  it('extends Error', () => {
    const err = new ApiError('test', 500)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })

  it('stores status and message', () => {
    const err = new ApiError('Acesso negado', 403)
    expect(err.message).toBe('Acesso negado')
    expect(err.status).toBe(403)
    expect(err.name).toBe('ApiError')
  })

  it('isUnauthorized is true for status 401', () => {
    expect(new ApiError('', 401).isUnauthorized).toBe(true)
    expect(new ApiError('', 403).isUnauthorized).toBe(false)
  })

  it('isForbidden is true for status 403', () => {
    expect(new ApiError('', 403).isForbidden).toBe(true)
    expect(new ApiError('', 401).isForbidden).toBe(false)
  })

  it('isConflict is true for status 409', () => {
    expect(new ApiError('', 409).isConflict).toBe(true)
    expect(new ApiError('', 200).isConflict).toBe(false)
  })

  it('isRateLimited is true for status 429', () => {
    expect(new ApiError('', 429).isRateLimited).toBe(true)
    expect(new ApiError('', 200).isRateLimited).toBe(false)
  })

  it('isNotFound is true for status 404', () => {
    expect(new ApiError('', 404).isNotFound).toBe(true)
  })

  it('instanceof check works after re-throw', () => {
    function thrower() { throw new ApiError('conflict', 409) }
    try {
      thrower()
    } catch (err) {
      expect(err instanceof ApiError).toBe(true)
      if (err instanceof ApiError) expect(err.isConflict).toBe(true)
    }
  })
})
