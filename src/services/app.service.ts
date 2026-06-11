import { api } from '@/lib/api'
import type { AppItemModel } from '@/types/models'

interface AppRow {
  id: string
  name: string
  description: string | null
  url: string
  icon_url: string | null
  pass_token: number
  is_active: number
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

function rowToApp(row: AppRow): AppItemModel {
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
    passUser: false,
    passToken: !!row.pass_token,
    url: row.url,
    route: null,
    allowedProfiles: parseJson(row.allowed_profiles),
    allowedUsers: parseJson(row.allowed_users),
    allowedTeams: parseJson(row.allowed_teams),
    status: row.is_active ? 'active' : 'maintenance',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getApps(): Promise<AppItemModel[]> {
  const rows = await api.get<AppRow[]>('/apps')
  return rows.map(rowToApp)
}

export function searchApps(apps: AppItemModel[], searchQuery: string): AppItemModel[] {
  const term = searchQuery.trim().toLowerCase()
  if (!term) return apps
  return apps.filter(
    (app) => app.name.toLowerCase().includes(term) || app.description.toLowerCase().includes(term)
  )
}

export function buildAppUrl(
  app: AppItemModel,
  userId: string,
  userName: string,
  userEmail: string
): string {
  if (!app.url) return '#'
  if (!app.passUser) return app.url
  const params = new URLSearchParams({ uid: userId, name: userName, email: userEmail })
  const sep = app.url.includes('?') ? '&' : '?'
  return `${app.url}${sep}${params.toString()}`
}
