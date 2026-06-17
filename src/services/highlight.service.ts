import { api } from '@/lib/api'
import type { HighlightModel } from '@/types/models'

interface HighlightRow {
  id: string
  title: string
  description: string | null
  badge_text: string | null
  cta_label: string | null
  cta_url: string | null
  image_url: string
  object_fit: string | null
  object_position: string | null
  is_active: number
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

function rowToHighlight(row: HighlightRow): HighlightModel {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    badgeText: row.badge_text ?? null,
    ctaLabel: row.cta_label ?? null,
    ctaUrl: row.cta_url ?? null,
    imageUrl: row.image_url,
    objectFit: (row.object_fit as 'cover' | 'contain') ?? 'cover',
    objectPosition: row.object_position ?? 'center',
    isActive: !!row.is_active,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getHighlights(): Promise<HighlightModel[]> {
  const rows = await api.get<HighlightRow[]>('/highlights')
  return rows.map(rowToHighlight)
}

export async function listAllHighlights(): Promise<HighlightModel[]> {
  const rows = await api.get<HighlightRow[]>('/highlights/all')
  return rows.map(rowToHighlight)
}

export interface CreateHighlightPayload {
  title: string
  description?: string
  badgeText?: string
  ctaLabel?: string
  ctaUrl?: string
  imageUrl: string
  objectFit?: string
  objectPosition?: string
  sortOrder?: number
}

export interface UpdateHighlightPayload {
  title?: string
  description?: string | null
  badge_text?: string | null
  cta_label?: string | null
  cta_url?: string | null
  image_url?: string
  object_fit?: string
  object_position?: string
  is_active?: boolean
  sort_order?: number
}

export async function createHighlight(payload: CreateHighlightPayload): Promise<HighlightModel> {
  const row = await api.post<HighlightRow>('/highlights', payload)
  return rowToHighlight(row)
}

export async function updateHighlight(id: string, payload: UpdateHighlightPayload): Promise<HighlightModel> {
  const row = await api.patch<HighlightRow>(`/highlights/${id}`, payload)
  return rowToHighlight(row)
}

export async function deleteHighlight(id: string): Promise<void> {
  await api.delete(`/highlights/${id}`)
}
