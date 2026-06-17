import { api } from '@/lib/api'
import type { AppManualModel } from '@/types/models'

interface ManualRow {
  id: string
  app_id: string
  app_name: string
  app_icon: string | null
  wiki_url: string | null
  pdf_url: string | null
  description: string | null
  is_active: number
  created_by: string
  created_at: string
  updated_at: string
}

function rowToManual(row: ManualRow): AppManualModel {
  return {
    id:          row.id,
    appId:       row.app_id,
    appName:     row.app_name,
    appIcon:     row.app_icon,
    wikiUrl:     row.wiki_url,
    pdfUrl:      row.pdf_url,
    description: row.description,
    isActive:    !!row.is_active,
    createdBy:   row.created_by,
    createdAt:   new Date(row.created_at),
    updatedAt:   new Date(row.updated_at),
  }
}

export async function getManuals(): Promise<AppManualModel[]> {
  const rows = await api.get<ManualRow[]>('/manuals')
  return rows.map(rowToManual)
}

export async function getAdminManuals(): Promise<AppManualModel[]> {
  const rows = await api.get<ManualRow[]>('/manuals/admin')
  return rows.map(rowToManual)
}

export async function createManual(data: {
  appId: string
  wikiUrl?: string
  pdfUrl?: string
  description?: string
}): Promise<AppManualModel> {
  const row = await api.post<ManualRow>('/manuals', {
    appId:       data.appId,
    wikiUrl:     data.wikiUrl || null,
    pdfUrl:      data.pdfUrl  || null,
    description: data.description || null,
  })
  return rowToManual(row)
}

export async function updateManual(
  id: string,
  data: { wiki_url?: string | null; pdf_url?: string | null; description?: string | null; is_active?: boolean }
): Promise<AppManualModel> {
  const row = await api.patch<ManualRow>(`/manuals/${id}`, data)
  return rowToManual(row)
}

export async function deleteManual(id: string): Promise<void> {
  return api.delete(`/manuals/${id}`)
}
