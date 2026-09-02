import { api } from '@/lib/api'

export interface BoardPost {
  id: string
  message: string
  pinned: boolean
  createdAt: string
  author: { id: string; name: string; photoUrl: string | null }
}

export async function getBoardPosts(): Promise<BoardPost[]> {
  return api.get<BoardPost[]>('/board')
}

export async function createBoardPost(message: string): Promise<BoardPost> {
  return api.post<BoardPost>('/board', { message })
}

export async function deleteBoardPost(id: string): Promise<void> {
  await api.delete<{ ok: boolean }>(`/board/${id}`)
}

export async function togglePinPost(id: string): Promise<{ pinned: boolean }> {
  return api.patch<{ pinned: boolean }>(`/board/${id}/pin`, {})
}
