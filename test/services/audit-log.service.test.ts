/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

const mockPost = vi.fn()
// Plain-function override used ONLY in the "never propagates" test.
// Bypasses vi.fn() spy tracking — @vitest/spy reports rejected mock returns
// as unhandled rejections before the service's try/catch can handle them.
let _rawPostOverride: ((...args: unknown[]) => unknown) | null = null

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) =>
      _rawPostOverride ? _rawPostOverride(...args) : mockPost(...args),
  },
}))

import {
  logLogin,
  logLogout,
  logAppOpen,
  logAccessRequest,
  AUDIT_ACTION,
} from '@/services/audit-log.service'
import type { UserModel } from '@/types/models'
import type { AppItemModel } from '@/types/models'

const user: UserModel = {
  id: 'uid-1',
  email: 'alice@sebratel.com.br',
  name: 'Alice',
  photoUrl: null,
  profile: 'employee',
  team: null,
  teamName: null,
  permissions: [],
  isActive: true,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  online: true,
  lastLogin: null,
}

const app: AppItemModel = {
  id: 'app-1',
  name: 'Meu App',
  icon: '📦',
  lottie: null,
  description: '',
  type: 'internal',
  launchMode: 'url',
  deepLink: null,
  openInExternalBrowser: false,
  passUser: false,
  passToken: false,
  url: 'https://app.example.com',
  route: null,
  allowedProfiles: [],
  allowedUsers: [],
  allowedTeams: [],
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
}

beforeEach(() => {
  mockPost.mockReset()
  _rawPostOverride = null
})

describe('audit-log.service', () => {
  it('logLogin sends LOGIN action without userName', async () => {
    mockPost.mockResolvedValue({ ok: true })
    await logLogin(user)
    expect(mockPost).toHaveBeenCalledOnce()
    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.action).toBe(AUDIT_ACTION.LOGIN)
    expect(payload).not.toHaveProperty('userName')
  })

  it('logLogout sends LOGOUT action', async () => {
    mockPost.mockResolvedValue({ ok: true })
    await logLogout(user)
    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.action).toBe(AUDIT_ACTION.LOGOUT)
  })

  it('logAppOpen sends APP_OPEN with app name in details', async () => {
    mockPost.mockResolvedValue({ ok: true })
    await logAppOpen(user, app)
    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.action).toBe(AUDIT_ACTION.APP_OPEN)
    // details is now a structured object { appId, appName } for reliable aggregation
    const details = payload.details as { appId: string; appName: string }
    expect(details.appName).toBe('Meu App')
  })

  it('logAccessRequest sends ACCESS_REQUEST_CREATE (not ACCESS_REQUEST)', async () => {
    mockPost.mockResolvedValue({ ok: true })
    await logAccessRequest(user, app)
    const [, payload] = mockPost.mock.calls[0] as [string, Record<string, unknown>]
    expect(payload.action).toBe(AUDIT_ACTION.ACCESS_REQUEST_CREATE)
    expect(payload.action).not.toBe('ACCESS_REQUEST')
  })

  it('never propagates audit log errors to the caller', async () => {
    // Use a plain async function (not a vi.fn() spy) so vitest's spy layer
    // does not report the rejection before logEvent's try/catch handles it.
    _rawPostOverride = async () => { throw new Error('network error') }
    const [result] = await Promise.allSettled([logLogin(user)])
    expect(result.status).toBe('fulfilled')
  })

  it('posts to /audit-logs endpoint', async () => {
    mockPost.mockResolvedValue({ ok: true })
    await logLogin(user)
    const [path] = mockPost.mock.calls[0] as [string]
    expect(path).toBe('/audit-logs')
  })

  it('AUDIT_ACTION is exported and contains all expected values', () => {
    expect(AUDIT_ACTION.LOGIN).toBe('LOGIN')
    expect(AUDIT_ACTION.ACCESS_REQUEST_CREATE).toBe('ACCESS_REQUEST_CREATE')
  })
})
