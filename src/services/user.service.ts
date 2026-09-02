import { api } from '@/lib/api'
import { ApiError } from '@/types/api'
import type { UserModel } from '@/types/models'

// Subset returned by /users/me and /users/provision (Sprint 2.5: SELECT * removed).
// Fields absent from these endpoints are marked optional and defaulted in rowToUserModel.
interface UserRow {
  id: string
  email: string
  name: string
  photo_url: string | null
  profile: string
  team: string | null
  is_active: number
  is_admin: number
  permissions?: string | string[]
  last_login: string | null
  online?: number
  created_at: string
  updated_at?: string
  birth_date?: string | null
  hire_date?: string | null
  status?: string | null
}

// Usuário presente (online agora) — retornado por /users/presence
export interface PresenceUser {
  id: string
  name: string
  photoUrl: string | null
  status: string | null
}

function assertUserRow(row: UserRow | undefined): UserRow {
  if (!row) {
    throw new ApiError('Nao foi possivel carregar seu perfil. A API retornou uma resposta vazia.', 502)
  }

  return row
}

function rowToUserModel(row: UserRow): UserModel {
  const permissions = Array.isArray(row.permissions)
    ? row.permissions
    : JSON.parse(row.permissions || '[]')

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    photoUrl: row.photo_url,
    profile: row.profile,
    team: row.team,
    teamName: null, // not returned by /users/me endpoint
    permissions,
    isActive: !!row.is_active,
    isAdmin: !!row.is_admin,
    createdAt: new Date(row.created_at),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(row.created_at),
    online: !!row.online,
    lastLogin: row.last_login ? new Date(row.last_login) : null,
    birthDate: row.birth_date ?? null,
    hireDate:  row.hire_date  ?? null,
    status:    row.status     ?? null,
  }
}

export async function getUserById(uid: string): Promise<UserModel | null> {
  try {
    const row = await api.get<UserRow>(`/users/${uid}`)
    return rowToUserModel(row)
  } catch {
    return null
  }
}

export async function provisionUserOnFirstLogin(
  _uid: string,
  email: string,
  name: string,
  photoUrl: string | null
): Promise<UserModel> {
  const row = await api.post<UserRow>('/users/provision', { name, email, photoUrl })
  return rowToUserModel(assertUserRow(row))
}

export async function updateMe(name: string): Promise<UserModel> {
  const row = await api.patch<UserRow>('/users/me', { name })
  return rowToUserModel(row)
}

export async function updateMyBirthDate(birthDate: string | null): Promise<UserModel> {
  const row = await api.patch<UserRow>('/users/me', { birth_date: birthDate })
  return rowToUserModel(row)
}

export async function updateMyStatus(status: string | null): Promise<UserModel> {
  const row = await api.patch<UserRow>('/users/me', { status })
  return rowToUserModel(row)
}

// ─── Diretório de pessoas ─────────────────────────────────────────────────────

export interface DirectoryPerson {
  id: string
  name: string
  photoUrl: string | null
  profile: string
  status: string | null
  teamName: string | null
  kudoCount: number
  birthMonth: number | null
  birthDay: number | null
  birthdayToday: boolean
  birthdayThisMonth: boolean
  tenureYears: number | null
}

export interface UserStats {
  kudosSent: number
  kudosReceived: number
  tenureYears: number | null
}

export type PublicProfile = DirectoryPerson  // mesma forma, reutilizamos

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  return api.get<PublicProfile>(`/users/${userId}/public`)
}

export async function getPeople(): Promise<DirectoryPerson[]> {
  return api.get<DirectoryPerson[]>('/users/people')
}

export async function getMyStats(): Promise<UserStats> {
  return api.get<UserStats>('/users/me/stats')
}

/** Lista usuários ativos agora (últimos 2 min de heartbeat) */
export async function getPresence(): Promise<PresenceUser[]> {
  const rows = await api.get<{ id: string; name: string; photo_url: string | null; status: string | null }[]>('/users/presence')
  return rows.map((r) => ({ id: r.id, name: r.name, photoUrl: r.photo_url, status: r.status }))
}

export async function saveUser(
  _uid: string,
  data: Partial<Omit<UserModel, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  // Only online/offline state is managed client-side; all other mutations go through admin endpoints.
  if ('online' in data && data.online === false) {
    await api.patch('/users/me/offline', {})
  }
}
