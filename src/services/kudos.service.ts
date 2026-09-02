import { api } from '@/lib/api'
import type { KudoModel } from '@/types/models'

// ─── Row shapes (API responses) ───────────────────────────────────────────────

interface KudoRow {
  id: string
  message: string
  created_at: string
  is_anonymous: 0 | 1
  from_id: string | null
  from_name: string
  from_photo: string | null
  to_id: string
  to_name: string
  to_photo: string | null
}

interface DirectoryRow {
  id: string
  name: string
  photo_url: string | null
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DirectoryUser {
  id: string
  name: string
  photoUrl: string | null
}

export interface CelebrationItem {
  id: string
  name: string
  photoUrl: string | null
  isBirthday: boolean
  isAnniversary: boolean
  anniversaryYears: number | null
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

function rowToKudo(row: KudoRow): KudoModel {
  return {
    id:          row.id,
    message:     row.message,
    createdAt:   new Date(row.created_at),
    isAnonymous: row.is_anonymous === 1,
    fromId:      row.from_id,
    fromName:    row.from_name,
    fromPhoto:   row.from_photo,
    toId:        row.to_id,
    toName:      row.to_name,
    toPhoto:     row.to_photo,
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** Feed dos últimos 20 kudos enviados */
export async function getKudosFeed(): Promise<KudoModel[]> {
  const rows = await api.get<KudoRow[]>('/kudos')
  return rows.map(rowToKudo)
}

/** Envia um kudo para um colega */
export async function sendKudo(
  toUserId: string,
  message: string,
  isAnonymous = false,
): Promise<KudoModel> {
  const row = await api.post<KudoRow>('/kudos', { toUserId, message, isAnonymous })
  return rowToKudo(row)
}

/** Lista todos os usuários ativos (para o seletor de destinatário) */
export async function getDirectory(): Promise<DirectoryUser[]> {
  const rows = await api.get<DirectoryRow[]>('/users/directory')
  return rows.map((r) => ({ id: r.id, name: r.name, photoUrl: r.photo_url }))
}

/** Celebrações do dia: aniversários e datas de empresa */
export async function getCelebrations(): Promise<CelebrationItem[]> {
  return api.get<CelebrationItem[]>('/users/celebrations')
}

// ─── MVP da Semana ────────────────────────────────────────────────────────────

export interface MvpUser {
  id: string
  name: string
  photoUrl: string | null
  kudoCount: number
}

/** Top 3 usuários com mais kudos recebidos nos últimos 7 dias */
export async function getWeeklyMvp(): Promise<MvpUser[]> {
  const rows = await api.get<{ id: string; name: string; photo_url: string | null; kudo_count: number }[]>('/kudos/mvp')
  return rows.map((r) => ({ id: r.id, name: r.name, photoUrl: r.photo_url, kudoCount: r.kudo_count }))
}

/** Últimos kudos recebidos por um usuário (para o perfil público) */
export async function getUserKudos(userId: string): Promise<KudoModel[]> {
  const rows = await api.get<KudoRow[]>(`/kudos/user/${userId}`)
  return rows.map(rowToKudo)
}
