import { api } from '@/lib/api'
import type { AnnouncementModel } from '@/types/models'
import type { AnnouncementType } from '@/types/enums'

interface AnnouncementRow {
  id: string
  title: string
  body: string | null
  type: string
  is_active: number
  created_by: string
  allowed_profiles: string | string[]
  created_at: string
  updated_at: string
}

function parseJson(value: string | string[]): string[] {
  if (Array.isArray(value)) return value
  try { return JSON.parse(value) } catch { return [] }
}

function rowToAnnouncement(row: AnnouncementRow): AnnouncementModel {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    type: (row.type as AnnouncementType) ?? 'info',
    isActive: !!row.is_active,
    createdBy: row.created_by,
    allowedProfiles: parseJson(row.allowed_profiles),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getAnnouncements(): Promise<AnnouncementModel[]> {
  const rows = await api.get<AnnouncementRow[]>('/announcements')
  return rows.map(rowToAnnouncement)
}

export async function adminGetAllAnnouncements(): Promise<AnnouncementModel[]> {
  const rows = await api.get<AnnouncementRow[]>('/announcements/all')
  return rows.map(rowToAnnouncement)
}

export interface CreateAnnouncementPayload {
  title: string
  body?: string | null
  type: AnnouncementType
  allowedProfiles?: string[]
}

export async function adminCreateAnnouncement(
  payload: CreateAnnouncementPayload
): Promise<AnnouncementModel> {
  const row = await api.post<AnnouncementRow>('/announcements', payload)
  return rowToAnnouncement(row)
}

export interface UpdateAnnouncementPayload {
  title?: string
  body?: string | null
  type?: AnnouncementType
  is_active?: 0 | 1
  allowed_profiles?: string[]
}

export async function adminUpdateAnnouncement(
  id: string,
  payload: UpdateAnnouncementPayload
): Promise<AnnouncementModel> {
  const row = await api.patch<AnnouncementRow>(`/announcements/${id}`, payload)
  return rowToAnnouncement(row)
}

export async function adminDeleteAnnouncement(id: string): Promise<void> {
  await api.delete(`/announcements/${id}`)
}
