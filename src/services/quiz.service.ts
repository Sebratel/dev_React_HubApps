import { api } from '@/lib/api'
import type {
  QuizToday,
  QuizRanking,
  QuizRankingEntry,
  QuizSubmitAnswer,
  QuizSubmitResult,
  QuizAdminQuestion,
} from '@/types/models'

export async function getTodayQuiz(): Promise<QuizToday> {
  return api.get<QuizToday>('/quiz/today')
}

export async function submitQuiz(answers: QuizSubmitAnswer[]): Promise<QuizSubmitResult> {
  return api.post<QuizSubmitResult>('/quiz/submit', { answers })
}

export async function getQuizRanking(): Promise<QuizRanking> {
  return api.get<QuizRanking>('/quiz/ranking')
}

export interface QuizHistoryMonth {
  month: string
  label: string
  ranking: (QuizRankingEntry & { position: number })[]
}

export async function getQuizHistory(): Promise<QuizHistoryMonth[]> {
  return api.get<QuizHistoryMonth[]>('/quiz/history')
}

// ── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminQuizQuestions(): Promise<QuizAdminQuestion[]> {
  return api.get<QuizAdminQuestion[]>('/quiz/questions')
}

export async function createAdminQuizQuestion(
  data: Omit<QuizAdminQuestion, 'id' | 'active'>,
): Promise<{ id: number }> {
  return api.post<{ id: number }>('/quiz/questions', data)
}

export async function updateAdminQuizQuestion(
  id: number,
  data: Partial<Omit<QuizAdminQuestion, 'id'>>,
): Promise<QuizAdminQuestion> {
  return api.patch<QuizAdminQuestion>(`/quiz/questions/${id}`, data)
}

export async function importAdminQuizQuestions(
  questions: Omit<QuizAdminQuestion, 'id' | 'active'>[],
): Promise<{ imported: number; ids: number[] }> {
  return api.post<{ imported: number; ids: number[] }>('/quiz/questions/import', { questions })
}

export async function deleteAdminQuizQuestion(id: number): Promise<{ ok: boolean }> {
  return api.delete<{ ok: boolean }>(`/quiz/questions/${id}`)
}
