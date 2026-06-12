import { api } from '@/lib/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type { AccessRequestModel } from '@/types/models'

// ─── Row → Model ─────────────────────────────────────────────────────────────
// Backend returns JOIN columns: user_name, user_email, user_team, reviewer_name

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
  // From JOIN users ON user_id
  user_name: string | null
  user_email: string | null
  user_team: string | null
  // From JOIN users ON reviewed_by
  reviewer_name: string | null
}

function rowToModel(row: AccessRequestRow): AccessRequestModel {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? '',
    email: row.user_email ?? '',
    teamId: null,
    teamName: row.user_team ?? '',
    appId: row.app_id,
    appName: row.app_name,
    reason: row.reason ?? '',
    status: row.status,
    requestedAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    reviewedByUserId: row.reviewed_by,
    reviewedByName: row.reviewer_name ?? null,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    reviewNote: row.review_note ?? null,
  }
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ListAccessRequestsParams extends PaginationParams {
  status?: 'pending' | 'approved' | 'rejected'
  app_id?: string
  user_id?: string
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listAllAccessRequests(
  params: ListAccessRequestsParams = {}
): Promise<PaginatedResponse<AccessRequestModel>> {
  const response = await api.getPaginated<AccessRequestRow>('/access-requests', params)
  return {
    data: response.data.map(rowToModel),
    pagination: response.pagination,
  }
}

export async function approveRequest(requestId: string): Promise<AccessRequestModel> {
  const row = await api.patch<AccessRequestRow>(`/access-requests/${requestId}`, {
    status: 'approved',
  })
  return rowToModel(row)
}

export async function rejectRequest(requestId: string, reviewNote?: string): Promise<AccessRequestModel> {
  const row = await api.patch<AccessRequestRow>(`/access-requests/${requestId}`, {
    status: 'rejected',
    ...(reviewNote?.trim() ? { review_note: reviewNote.trim() } : {}),
  })
  return rowToModel(row)
}
