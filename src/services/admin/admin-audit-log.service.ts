import { api } from '@/lib/api'
import type { AuditAction, PaginatedResponse, PaginationParams } from '@/types/api'
import type { AuditLogModel } from '@/types/models'

// ─── Row → Model ─────────────────────────────────────────────────────────────

interface AuditLogRow {
  id: string
  user_id: string
  user_name: string
  user_photo_url: string | null
  action: string
  details: string | null
  ip_address: string | null
  created_at: string
}

function rowToModel(row: AuditLogRow): AuditLogModel {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userPhotoUrl: row.user_photo_url ?? null,
    action: row.action,
    details: row.details ?? '',
    timestamp: new Date(row.created_at),
  }
}

// ─── Params ───────────────────────────────────────────────────────────────────

export interface ListAuditLogsParams extends PaginationParams {
  user_id?: string
  action?: AuditAction
  date_from?: string // ISO date string: '2026-01-01'
  date_to?: string // ISO date string: '2026-12-31'
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listAuditLogs(
  params: ListAuditLogsParams = {}
): Promise<PaginatedResponse<AuditLogModel>> {
  const response = await api.getPaginated<AuditLogRow>('/audit-logs', params)
  return {
    data: response.data.map(rowToModel),
    pagination: response.pagination,
  }
}
