/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/firebase', () => ({
  auth: { currentUser: { uid: 'test-uid' } },
  db: {},
  rtdb: {},
  functions: {},
}))

vi.mock('firebase/auth', () => ({
  getIdToken: vi.fn(() => Promise.resolve('mock-firebase-token')),
}))

import { api } from '@/lib/api'
import { ApiError } from '@/types/api'

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      json: () => Promise.resolve(body),
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('api.get', () => {
  it('sends Authorization header with token', async () => {
    mockFetch(200, { id: '1' })
    await api.get('/test')
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-firebase-token')
  })

  it('appends query params to URL', async () => {
    mockFetch(200, [])
    await api.get('/users', { limit: 10, offset: 0 })
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(url).toContain('limit=10')
    expect(url).toContain('offset=0')
  })

  it('omits undefined and null params', async () => {
    mockFetch(200, [])
    await api.get('/users', { limit: 10, offset: undefined, status: null })
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string]
    expect(url).not.toContain('offset')
    expect(url).not.toContain('status')
  })

  it('returns parsed JSON on success', async () => {
    mockFetch(200, { name: 'Alice' })
    const result = await api.get<{ name: string }>('/users/me')
    expect(result.name).toBe('Alice')
  })
})

describe('api error handling', () => {
  it('throws ApiError with status and message from backend', async () => {
    mockFetch(403, { error: 'Acesso restrito a administradores' })
    await expect(api.get('/users')).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.status === 403 && err.isForbidden,
    )
  })

  it('throws ApiError 401 for unauthorized', async () => {
    mockFetch(401, { error: 'Token inválido ou expirado' })
    await expect(api.get('/users/me')).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.isUnauthorized,
    )
  })

  it('throws ApiError 409 for conflict', async () => {
    mockFetch(409, { error: 'Solicitação já foi processada' })
    await expect(api.patch('/access-requests/1', { status: 'approved' })).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.isConflict,
    )
  })

  it('throws ApiError 429 for rate limit', async () => {
    mockFetch(429, { error: 'Limite excedido' })
    await expect(api.post('/audit-logs', { action: 'LOGIN' })).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.isRateLimited,
    )
  })

  it('uses statusText as fallback when response has no error field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('not json')),
      }),
    )
    await expect(api.get('/test')).rejects.toSatisfy(
      (err: unknown) => err instanceof ApiError && err.status === 500,
    )
  })
})

describe('api.getPaginated', () => {
  it('returns PaginatedResponse shape', async () => {
    const paginated = { data: [{ id: '1' }], pagination: { limit: 50, offset: 0, total: 1 } }
    mockFetch(200, paginated)
    const result = await api.getPaginated<{ id: string }>('/users')
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('pagination')
    expect(result.pagination.total).toBe(1)
    expect(result.data[0].id).toBe('1')
  })
})

describe('api.post', () => {
  it('sends body as JSON', async () => {
    mockFetch(201, { ok: true })
    await api.post('/audit-logs', { action: 'LOGIN', details: null })
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({ action: 'LOGIN', details: null })
  })
})
