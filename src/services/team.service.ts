import { api } from '@/lib/api'

export interface TeamModel {
  id: string
  name: string
  description: string | null
  isActive: boolean
  memberCount: number
  createdAt: Date
  updatedAt: Date
}

interface TeamRow {
  id: string
  name: string
  description: string | null
  is_active: number
  member_count: number
  created_at: string
  updated_at: string
}

function rowToTeam(row: TeamRow): TeamModel {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: !!row.is_active,
    memberCount: Number(row.member_count ?? 0),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

export async function getTeams(): Promise<TeamModel[]> {
  const rows = await api.get<TeamRow[]>('/teams')
  return rows.map(rowToTeam)
}

export async function adminGetAllTeams(): Promise<TeamModel[]> {
  const rows = await api.get<TeamRow[]>('/teams/all')
  return rows.map(rowToTeam)
}

export interface TeamPayload {
  name: string
  description?: string | null
}

export async function adminCreateTeam(payload: TeamPayload): Promise<TeamModel> {
  const row = await api.post<TeamRow>('/teams', payload)
  return rowToTeam(row)
}

export async function adminUpdateTeam(
  id: string,
  payload: Partial<TeamPayload> & { is_active?: 0 | 1 }
): Promise<TeamModel> {
  const row = await api.patch<TeamRow>(`/teams/${id}`, payload)
  return rowToTeam(row)
}

export async function adminDeleteTeam(id: string): Promise<void> {
  await api.delete(`/teams/${id}`)
}
