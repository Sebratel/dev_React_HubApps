import { api } from '@/lib/api'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

export type VoteValue = 1 | -1 | 0

export interface SuggestionVoter {
  name: string
  photoUrl: string | null
}

export interface SuggestionModel {
  id: string
  appId: string | null
  appName: string | null
  sector: string | null
  userId: string
  userName: string
  userPhotoUrl: string | null
  title: string
  body: string | null
  type: SuggestionType
  status: SuggestionStatus
  adminNote: string | null
  createdAt: Date
  updatedAt: Date
  // Engagement
  score: number
  upCount: number
  downCount: number
  myVote: 1 | -1 | null
  commentCount: number
  upVoters: SuggestionVoter[]
  /** @deprecated use upVoters */
  upVoterNames: string[]
}

export interface SuggestionComment {
  id: string
  suggestionId: string
  userId: string
  userName: string
  userPhotoUrl: string | null
  body: string
  createdAt: Date
}

interface SuggestionRow {
  id: string
  app_id: string | null
  app_name: string | null
  sector: string | null
  user_id: string
  user_name: string
  user_photo_url?: string | null
  title: string
  body: string | null
  type: SuggestionType
  status: SuggestionStatus
  admin_note: string | null
  created_at: string
  updated_at: string
  up_count?: number | string | null
  down_count?: number | string | null
  score?: number | string | null
  my_vote?: number | null
  comment_count?: number | string | null
  up_voter_names?: string | null
  up_voter_photos?: string | null
}

interface SuggestionCommentRow {
  id: string
  suggestion_id: string
  user_id: string
  user_name: string
  user_photo_url?: string | null
  body: string
  created_at: string
}

function toInt(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function parseVoters(names: string | null | undefined, photos: string | null | undefined): SuggestionVoter[] {
  const nameList = names?.split('||').filter(Boolean) ?? []
  const photoList = photos?.split('||') ?? []
  return nameList.map((name, i) => ({
    name,
    photoUrl: photoList[i]?.trim() || null,
  }))
}

function rowToSuggestion(row: SuggestionRow): SuggestionModel {
  const myVote = row.my_vote === 1 ? 1 : row.my_vote === -1 ? -1 : null
  const upVoters = parseVoters(row.up_voter_names, row.up_voter_photos)
  return {
    id:        row.id,
    appId:     row.app_id,
    appName:   row.app_name,
    sector:    row.sector,
    userId:    row.user_id,
    userName:  row.user_name,
    userPhotoUrl: row.user_photo_url ?? null,
    title:     row.title,
    body:      row.body,
    type:      row.type,
    status:    row.status,
    adminNote: row.admin_note,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    score:        toInt(row.score),
    upCount:      toInt(row.up_count),
    downCount:    toInt(row.down_count),
    myVote,
    commentCount: toInt(row.comment_count),
    upVoters,
    upVoterNames: upVoters.map((v) => v.name),
  }
}

function rowToComment(row: SuggestionCommentRow): SuggestionComment {
  return {
    id:           row.id,
    suggestionId: row.suggestion_id,
    userId:       row.user_id,
    userName:     row.user_name,
    userPhotoUrl: row.user_photo_url ?? null,
    body:         row.body,
    createdAt:    new Date(row.created_at),
  }
}

export interface CreateSuggestionPayload {
  title: string
  body?: string | null
  type: SuggestionType
  sector: string
  appId?: string | null
  appName?: string | null
}

/** Community feed: all suggestions, enriched with the current user's engagement. */
export async function getSuggestions(): Promise<SuggestionModel[]> {
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

/** Apoiar (1), não apoiar (-1) ou remover voto (0). Returns the updated suggestion. */
export async function voteSuggestion(id: string, value: VoteValue): Promise<SuggestionModel> {
  const row = await api.post<SuggestionRow>(`/suggestions/${id}/vote`, { value })
  return rowToSuggestion(row)
}

export async function getSuggestionComments(id: string): Promise<SuggestionComment[]> {
  const rows = await api.get<SuggestionCommentRow[]>(`/suggestions/${id}/comments`)
  return rows.map(rowToComment)
}

export async function addSuggestionComment(id: string, body: string): Promise<SuggestionComment> {
  const row = await api.post<SuggestionCommentRow>(`/suggestions/${id}/comments`, { body })
  return rowToComment(row)
}

export async function adminUpdateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
  adminNote?: string | null
): Promise<SuggestionModel> {
  const row = await api.patch<SuggestionRow>(`/suggestions/${id}/status`, { status, adminNote })
  return rowToSuggestion(row)
}
