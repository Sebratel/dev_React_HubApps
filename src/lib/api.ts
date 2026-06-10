import { auth } from '@/firebase'
import { getIdToken } from 'firebase/auth'
import { ApiError, type PaginatedResponse, type QueryParams } from '@/types/api'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

async function getToken(): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new ApiError('Usuário não autenticado', 401)
  return getIdToken(user)
}

function buildUrl(path: string, params?: QueryParams): string {
  if (!params) return `${API_URL}${path}`
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `${API_URL}${path}?${qs}` : `${API_URL}${path}`
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: QueryParams,
): Promise<T> {
  const token = await getToken()
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: res.statusText }))
    const message = (payload as { error?: string }).error ?? `Erro ${res.status}`
    throw new ApiError(message, res.status)
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string, params?: QueryParams) =>
    request<T>('GET', path, undefined, params),

  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, body),

  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body),

  delete: <T>(path: string) =>
    request<T>('DELETE', path),

  getPaginated: <T>(path: string, params?: QueryParams) =>
    request<PaginatedResponse<T>>('GET', path, undefined, params),
}
