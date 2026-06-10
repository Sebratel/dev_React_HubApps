/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/firebase', () => ({ db: {}, auth: {}, rtdb: {}, functions: {} }))

const mockGetPaginated = vi.fn()
const mockPost = vi.fn()
vi.mock('@/lib/api', () => ({
  api: {
    getPaginated: (...args: unknown[]) => mockGetPaginated(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

import {
  validateReason,
  ACCESS_REQUEST_MIN_REASON_LENGTH,
  getUserAccessRequests,
  createAccessRequest,
} from '@/services/access-request.service'
import { ApiError } from '@/types/api'
import type { UserModel } from '@/types/models'
import type { AppItemModel } from '@/types/models'

// ─── validateReason (existing tests, unchanged) ───────────────────────────────

describe('validateReason', () => {
  it('returns null for a valid reason (>= min length)', () => {
    expect(validateReason('Preciso de acesso para trabalhar')).toBeNull()
    expect(validateReason('1'.repeat(ACCESS_REQUEST_MIN_REASON_LENGTH))).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validateReason('')).not.toBeNull()
  })

  it('returns error for whitespace-only string', () => {
    expect(validateReason('   ')).not.toBeNull()
  })

  it('returns error for reason shorter than minimum after trimming', () => {
    const short = 'a'.repeat(ACCESS_REQUEST_MIN_REASON_LENGTH - 1)
    expect(validateReason(short)).not.toBeNull()
  })

  it('error message includes the minimum character count', () => {
    const err = validateReason('short')
    expect(err).not.toBeNull()
    expect(err!).toContain(String(ACCESS_REQUEST_MIN_REASON_LENGTH))
  })

  it('pads do not inflate length — trims before checking', () => {
    const padded = '  ' + 'a'.repeat(ACCESS_REQUEST_MIN_REASON_LENGTH - 1) + '  '
    expect(validateReason(padded)).not.toBeNull()
  })

  it('passes when trimmed content meets minimum length', () => {
    const padded = '  ' + 'a'.repeat(ACCESS_REQUEST_MIN_REASON_LENGTH) + '  '
    expect(validateReason(padded)).toBeNull()
  })
})

// ─── getUserAccessRequests (paginated response) ───────────────────────────────

describe('getUserAccessRequests', () => {
  beforeEach(() => mockGetPaginated.mockReset())

  it('reads data from paginated response', async () => {
    const row = {
      id: 'req-1', user_id: 'u1', app_id: 'a1', app_name: 'App',
      reason: 'Need access', status: 'pending',
      reviewed_by: null, reviewed_at: null,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    }
    mockGetPaginated.mockResolvedValue({
      data: [row],
      pagination: { limit: 50, offset: 0, total: 1 },
    })

    const result = await getUserAccessRequests('u1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('req-1')
    expect(result[0].status).toBe('pending')
    expect(result[0].requestedAt).toBeInstanceOf(Date)
  })

  it('returns empty array when data is empty', async () => {
    mockGetPaginated.mockResolvedValue({ data: [], pagination: { limit: 50, offset: 0, total: 0 } })
    const result = await getUserAccessRequests('u1')
    expect(result).toEqual([])
  })

  it('calls /access-requests/me endpoint', async () => {
    mockGetPaginated.mockResolvedValue({ data: [], pagination: { limit: 50, offset: 0, total: 0 } })
    await getUserAccessRequests('u1')
    expect(mockGetPaginated).toHaveBeenCalledWith('/access-requests/me')
  })
})

// ─── createAccessRequest (409 handling) ──────────────────────────────────────

const user: UserModel = {
  id: 'uid-1', email: 'alice@sebratel.com.br', name: 'Alice',
  photoUrl: null, profile: 'employee', team: null, permissions: [],
  isActive: true, isAdmin: false,
  createdAt: new Date(), updatedAt: new Date(), online: true, lastLogin: null,
}

const app: AppItemModel = {
  id: 'app-1', name: 'Meu App', icon: '📦', lottie: null, description: '',
  type: 'internal', launchMode: 'url', deepLink: null,
  openInExternalBrowser: false, passUser: false, passToken: false,
  url: 'https://app.example.com', route: null,
  allowedProfiles: [], allowedUsers: [], allowedTeams: [],
  status: 'active', createdAt: new Date(), updatedAt: new Date(),
}

describe('createAccessRequest', () => {
  beforeEach(() => {
    mockGetPaginated.mockReset()
    mockPost.mockReset()
  })

  it('rejects with validation error for short reason', async () => {
    await expect(createAccessRequest(user, app, 'short')).rejects.toThrow(/mínimo|pelo menos/i)
  })

  it('rejects if a pending request already exists', async () => {
    mockGetPaginated.mockResolvedValue({
      data: [{
        id: 'req-old', user_id: 'uid-1', app_id: 'app-1', app_name: 'Meu App',
        reason: 'já pedido', status: 'pending',
        reviewed_by: null, reviewed_at: null,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }],
      pagination: { limit: 50, offset: 0, total: 1 },
    })
    await expect(
      createAccessRequest(user, app, 'motivo suficientemente longo aqui'),
    ).rejects.toThrow(/pendente/)
  })

  it('creates request and returns AccessRequestModel', async () => {
    mockGetPaginated.mockResolvedValue({ data: [], pagination: { limit: 50, offset: 0, total: 0 } })
    mockPost.mockResolvedValue({ id: 'req-new' })

    const result = await createAccessRequest(user, app, 'Preciso de acesso urgente')
    expect(result.id).toBe('req-new')
    expect(result.status).toBe('pending')
    expect(result.appId).toBe('app-1')
    expect(result.reason).toBe('Preciso de acesso urgente')
  })

  it('treats 409 from server as "already processed" error', async () => {
    mockGetPaginated.mockResolvedValue({ data: [], pagination: { limit: 50, offset: 0, total: 0 } })
    mockPost.mockRejectedValue(new ApiError('Conflict', 409))

    await expect(
      createAccessRequest(user, app, 'Preciso de acesso ao sistema'),
    ).rejects.toThrow(/pendente ou processada/)
  })

  it('re-throws non-409 errors from server', async () => {
    mockGetPaginated.mockResolvedValue({ data: [], pagination: { limit: 50, offset: 0, total: 0 } })
    mockPost.mockRejectedValue(new ApiError('Servidor offline', 503))

    const err = await createAccessRequest(user, app, 'Preciso de acesso ao sistema').catch(e => e)
    expect(err).toBeInstanceOf(ApiError)
    expect((err as ApiError).status).toBe(503)
  })
})
