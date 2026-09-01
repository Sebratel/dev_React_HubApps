import { api } from '@/lib/api'
import type { PaginatedResponse, PaginationParams } from '@/types/api'
import type { UserModel } from '@/types/models'

// ─── Row → Model ─────────────────────────────────────────────────────────────

interface AdminUserRow {
  id: string
  email: string
  name: string
  photo_url: string | null
  profile: string
  team: string | null
  team_name: string | null
  is_active: number
  is_admin: number
  last_login: string | null
  created_at: string
}

function rowToUserModel(row: AdminUserRow): UserModel {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    photoUrl: row.photo_url,
    profile: row.profile,
    team: row.team,
    teamName: row.team_name ?? null,
    permissions: [],
    isActive: !!row.is_active,
    isAdmin: !!row.is_admin,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.created_at),
    online: false,
    lastLogin: row.last_login ? new Date(row.last_login) : null,
  }
}

// ─── Params ───────────────────────────────────────────────────────────────────

// Extend when admin user filters are added (Sprint 3)
export type ListUsersParams = PaginationParams

// ─── Service ─────────────────────────────────────────────────────────────────

export async function listUsers(
  params: ListUsersParams = {}
): Promise<PaginatedResponse<UserModel>> {
  const response = await api.getPaginated<AdminUserRow>('/users', params)
  return {
    data: response.data.map(rowToUserModel),
    pagination: response.pagination,
  }
}

export async function activateUser(userId: string): Promise<UserModel> {
  const row = await api.patch<AdminUserRow>(`/users/${userId}`, { is_active: 1 })
  return rowToUserModel(row)
}

export async function deactivateUser(userId: string): Promise<UserModel> {
  const row = await api.patch<AdminUserRow>(`/users/${userId}`, { is_active: 0 })
  return rowToUserModel(row)
}

export async function promoteToAdmin(userId: string): Promise<UserModel> {
  const row = await api.patch<AdminUserRow>(`/users/${userId}`, { is_admin: 1 })
  return rowToUserModel(row)
}

export async function revokeAdmin(userId: string): Promise<UserModel> {
  const row = await api.patch<AdminUserRow>(`/users/${userId}`, { is_admin: 0 })
  return rowToUserModel(row)
}

export interface CreateExternalUserPayload {
  name: string
  email: string
  password: string
  profile?: string
  teamId?: string | null
}

export async function createExternalUser(payload: CreateExternalUserPayload): Promise<UserModel> {
  const row = await api.post<AdminUserRow>('/users/create-external', payload)
  return rowToUserModel(row)
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<UserModel, 'profile' | 'team'>>
): Promise<UserModel> {
  const payload: Record<string, unknown> = {}
  if (data.profile !== undefined) payload.profile = data.profile
  if (data.team !== undefined) payload.team = data.team
  const row = await api.patch<AdminUserRow>(`/users/${userId}`, payload)
  return rowToUserModel(row)
}
