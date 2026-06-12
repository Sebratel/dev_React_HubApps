import { api } from '@/lib/api'
import { ApiError } from '@/types/api'
import type { AccessRequestModel, AppItemModel, UserModel } from '@/types/models'

export const ACCESS_REQUEST_MIN_REASON_LENGTH = 8

export function validateReason(reason: string): string | null {
  if (!reason.trim()) return 'Motivo é obrigatório.'
  if (reason.trim().length < ACCESS_REQUEST_MIN_REASON_LENGTH)
    return `Motivo deve ter pelo menos ${ACCESS_REQUEST_MIN_REASON_LENGTH} caracteres.`
  return null
}

interface AccessRequestRow {
  id: string
  user_id: string
  app_id: string
  app_name: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  updated_at: string
}

function rowToAccessRequest(row: AccessRequestRow): AccessRequestModel {
  return {
    id: row.id,
    userId: row.user_id,
    userName: '',
    email: '',
    teamId: null,
    teamName: '',
    appId: row.app_id,
    appName: row.app_name,
    reason: row.reason ?? '',
    status: row.status,
    requestedAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    reviewedByUserId: row.reviewed_by,
    reviewedByName: null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    reviewNote: row.review_note ?? null,
  }
}

export async function getUserAccessRequests(_userId: string): Promise<AccessRequestModel[]> {
  // API now returns paginated response; we extract data transparently for callers.
  const response = await api.getPaginated<AccessRequestRow>('/access-requests/me')
  return response.data.map(rowToAccessRequest)
}

export async function getPendingRequestForApp(
  userId: string,
  appId: string
): Promise<AccessRequestModel | null> {
  const requests = await getUserAccessRequests(userId)
  return requests.find((r) => r.appId === appId && r.status === 'pending') ?? null
}

export async function createAccessRequest(
  user: UserModel,
  app: AppItemModel,
  reason: string
): Promise<AccessRequestModel> {
  const validationError = validateReason(reason)
  if (validationError) throw new Error(validationError)

  const existing = await getPendingRequestForApp(user.id, app.id)
  if (existing) throw new Error('Já existe uma solicitação pendente para este aplicativo.')

  try {
    const { id } = await api.post<{ id: string }>('/access-requests', {
      appId: app.id,
      appName: app.name,
      reason: reason.trim(),
    })

    const now = new Date()
    return {
      id,
      userId: user.id,
      userName: user.name || user.email,
      email: user.email,
      teamId: user.team,
      teamName: '',
      appId: app.id,
      appName: app.name,
      reason: reason.trim(),
      status: 'pending',
      requestedAt: now,
      updatedAt: now,
      reviewedByUserId: null,
      reviewedByName: null,
      reviewedAt: null,
      reviewNote: null,
    }
  } catch (err) {
    // 409 means the backend detected a concurrent duplicate request
    if (err instanceof ApiError && err.isConflict) {
      throw new Error('Já existe uma solicitação pendente ou processada para este aplicativo.')
    }
    throw err
  }
}
