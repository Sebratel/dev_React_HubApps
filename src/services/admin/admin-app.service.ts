import { api } from '@/lib/api'
import type { AppItemModel } from '@/types/models'

// ─── Row → Model ─────────────────────────────────────────────────────────────

interface AdminAppRow {
  id: string
  name: string
  description: string | null
  url: string
  icon_url: string | null
  pass_token: number
  pass_user: number
  is_active: number
  status: string
  allowed_profiles: string | string[]
  allowed_users: string | string[]
  allowed_teams: string | string[]
  created_at: string
  updated_at: string
}

function parseJson(value: string | string[]): string[] {
  if (Array.isArray(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

function rowToAppModel(row: AdminAppRow): AppItemModel {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon_url ?? '📦',
    lottie: null,
    description: row.description ?? '',
    type: 'internal',
    launchMode: 'url',
    deepLink: null,
    openInExternalBrowser: false,
    passUser: !!row.pass_user,
    passToken: !!row.pass_token,
    url: row.url,
    route: null,
    allowedProfiles: parseJson(row.allowed_profiles),
    allowedUsers: parseJson(row.allowed_users),
    allowedTeams: parseJson(row.allowed_teams),
    status: (row.status as import('@/types/enums').AppStatus) ?? (row.is_active ? 'active' : 'maintenance'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface CreateAppPayload {
  name: string
  url: string
  description?: string
  iconUrl?: string
  passToken?: boolean
  passUser?: boolean
  status?: 'active' | 'maintenance' | 'novo'
  allowedProfiles?: string[]
  allowedUsers?: string[]
  allowedTeams?: string[]
}

export interface UpdateAppPayload {
  name?: string
  url?: string
  description?: string
  icon_url?: string
  pass_token?: boolean
  pass_user?: boolean
  is_active?: boolean
  status?: 'active' | 'maintenance' | 'novo'
  allowed_profiles?: string[]
  allowed_users?: string[]
  allowed_teams?: string[]
}

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listAllApps(): Promise<AppItemModel[]> {
  const rows = await api.get<AdminAppRow[]>('/apps/all')
  return rows.map(rowToAppModel)
}

export async function createApp(payload: CreateAppPayload): Promise<AppItemModel> {
  const row = await api.post<AdminAppRow>('/apps', payload)
  return rowToAppModel(row)
}

export async function updateApp(appId: string, payload: UpdateAppPayload): Promise<AppItemModel> {
  const row = await api.patch<AdminAppRow>(`/apps/${appId}`, payload)
  return rowToAppModel(row)
}

export async function deactivateApp(appId: string): Promise<AppItemModel> {
  const row = await api.patch<AdminAppRow>(`/apps/${appId}`, { is_active: false, status: 'maintenance' })
  return rowToAppModel(row)
}

export async function reactivateApp(appId: string): Promise<AppItemModel> {
  const row = await api.patch<AdminAppRow>(`/apps/${appId}`, { is_active: true, status: 'active' })
  return rowToAppModel(row)
}
