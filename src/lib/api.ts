import { auth, storage } from '@/firebase'
import { getIdToken } from 'firebase/auth'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { ApiError, type PaginatedResponse, type QueryParams } from '@/types/api'

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
export const API_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:3000' : '')

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

  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: res.statusText }))
    const message = (payload as { error?: string }).error ?? `Erro ${res.status}`
    throw new ApiError(message, res.status)
  }

  // 204 No Content — sem corpo para parsear
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
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

// Upload a file directly to Firebase Storage. Returns a permanent public download URL
// that works regardless of environment (dev/prod/Portainer).
export async function uploadFileToStorage(
  folder: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const user = auth.currentUser
  if (!user) throw new ApiError('Usuário não autenticado', 401)

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${folder}/${user.uid}_${Date.now()}.${ext}`
  const storageRef = ref(storage, path)
  const task = uploadBytesResumable(storageRef, file)

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress) onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100))
      },
      (err) => reject(new ApiError(err.message, 0)),
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref))
        } catch (err) {
          reject(err)
        }
      },
    )
  })
}

export const api = {
  get: <T>(path: string, params?: QueryParams) => request<T>('GET', path, undefined, params),

  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),

  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),

  delete: <T>(path: string) => request<T>('DELETE', path),

  getPaginated: <T>(path: string, params?: QueryParams) =>
    request<PaginatedResponse<T>>('GET', path, undefined, params),
}
