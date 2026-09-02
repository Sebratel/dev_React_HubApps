import { api } from '@/lib/api'

export interface PollOption {
  id: string
  text: string
  voteCount: number
  percent: number
}

export interface Poll {
  id: string
  question: string
  createdAt: string
  closesAt: string | null
  creator: { id: string; name: string; photoUrl: string | null }
  myVote: string | null  // option id se já votou
  totalVotes: number
  options: PollOption[]
}

export interface CreatePollPayload {
  question: string
  options: string[]
  closesAt?: string | null
}

export async function getPolls(): Promise<Poll[]> {
  return api.get<Poll[]>('/polls')
}

export async function createPoll(payload: CreatePollPayload): Promise<{ id: string }> {
  return api.post<{ id: string }>('/polls', payload)
}

export async function votePoll(pollId: string, optionId: string): Promise<void> {
  await api.post<{ ok: boolean }>(`/polls/${pollId}/vote`, { optionId })
}

export async function closePoll(pollId: string): Promise<void> {
  await api.patch<{ ok: boolean }>(`/polls/${pollId}`, { isActive: false })
}
