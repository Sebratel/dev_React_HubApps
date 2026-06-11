import { api } from '@/lib/api'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

export interface SuggestionModel {
  id: string
  appId: string | null
  appName: string | null
  userId: string
  userName: string
  title: string
  body: string | null
  type: SuggestionType
  status: SuggestionStatus
  adminNote: string | null
  createdAt: Date
  updatedAt: Date
}

interface SuggestionRow {
  id: string
  app_id: string | null
  app_name: string | null
  user_id: string
  user_name: string
  title: string
  body: string | null
  type: SuggestionType
  status: SuggestionStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

function rowToSuggestion(row: SuggestionRow): SuggestionModel {
  return {
    id:        row.id,
    appId:     row.app_id,
    appName:   row.app_name,
    userId:    row.user_id,
    userName:  row.user_name,
    title:     row.title,
    body:      row.body,
    type:      row.type,
    status:    row.status,
    adminNote: row.admin_note,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export interface CreateSuggestionPayload {
  title: string
  body?: string | null
  type: SuggestionType
  appId?: string | null
  appName?: string | null
}

export async function getMySuggestions(): Promise<SuggestionModel[]> {
  const rows = await api.get<SuggestionRow[]>('/suggestions')
  return rows.map(rowToSuggestion)
}

export async function adminGetAllSuggestions(): Promise<SuggestionModel[]> {
  const rows = await api.get<SuggestionRow[]>('/suggestions/all')
  return rows.map(rowToSuggestion)
}

export async function createSuggestion(payload: CreateSuggestionPayload): Promise<SuggestionModel> {
  const row = await api.post<SuggestionRow>('/suggestions', payload)
  return rowToSuggestion(row)
}

export async function adminUpdateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
  adminNote?: string | null
): Promise<SuggestionModel> {
  const row = await api.patch<SuggestionRow>(`/suggestions/${id}/status`, { status, adminNote })
  return rowToSuggestion(row)
}
