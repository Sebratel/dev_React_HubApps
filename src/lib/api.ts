import { auth } from '@/firebase'
import { getIdToken } from 'firebase/auth'
import { ApiError, type PaginatedResponse, type QueryParams } from '@/types/api'

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const API_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:3000' : '')

/** Normaliza URLs de assets servidos pela API (uploads, imagens legadas). */
export function resolveAssetUrl(url: string): string {
  if (!url) return url
  if (/^(data:|https?:)/i.test(url)) return url
  if (url.startsWith('/api/')) return url
  if (url.startsWith('/uploads/')) return `${API_URL}${url}`
  return url
}

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

async function readJsonResponse(res: Response): Promise<unknown | undefined> {
  const text = await res.text()
  if (!text.trim()) return undefined

  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError('A API retornou uma resposta invalida. Tente novamente em instantes.', res.status)
  }
}

function getErrorMessage(payload: unknown, res: Response): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof (payload as { error?: unknown }).error === 'string'
  ) {
    return (payload as { error: string }).error
  }

  return res.statusText || `Erro ${res.status}`
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: QueryParams
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      'Configuracao ausente: defina VITE_API_URL no build do frontend antes do deploy.',
      500
    )
  }

  const token = await getToken()
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const payload = await readJsonResponse(res)

  if (!res.ok) {
    throw new ApiError(getErrorMessage(payload, res), res.status)
  }

  // Respostas sem corpo sao validas para endpoints tipados como void.
  if (res.status === 204 || payload === undefined) return undefined as T

  return payload as T
}

// Upload a file with progress tracking. Returns the full public URL.
export async function uploadFile(
  path: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new ApiError('Usuário não autenticado', 401)
  const token = await getIdToken(user)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd  = new FormData()
    fd.append('image', file)

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText) as { path: string }
        resolve(`${API_URL}${data.path}`)
      } else {
        const errMsg = (() => {
          try { return (JSON.parse(xhr.responseText) as { error?: string }).error ?? `Erro ${xhr.status}` }
          catch { return `Erro ${xhr.status}` }
        })()
        reject(new ApiError(errMsg, xhr.status))
      }
    }

    xhr.onerror = () => reject(new ApiError('Erro de rede ao enviar o arquivo', 0))

    xhr.open('POST', `${API_URL}${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(fd)
  })
}

// Convert an image file to a compressed Base64 data URI for storage in the database.
// Resizes to max 1200px wide and encodes as JPEG at 82% quality.
export async function imageToBase64(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    onProgress?.(10)
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      onProgress?.(40)
      const MAX_W = 1200
      const scale = img.width > MAX_W ? MAX_W / img.width : 1
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas não disponível')); return }

      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      onProgress?.(80)

      const dataUri = canvas.toDataURL('image/jpeg', 0.82)
      onProgress?.(100)
      resolve(dataUri)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível carregar a imagem'))
    }

    img.src = url
  })
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, undefined, params),

  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),

  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),

  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),

  delete: <T>(path: string) => request<T>('DELETE', path),

  getPaginated: <T>(path: string, params?: QueryParams) =>
    request<PaginatedResponse<T>>('GET', path, undefined, params),
}
