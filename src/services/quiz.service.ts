import { api } from '@/lib/api'
import type {
  QuizToday,
  QuizRanking,
  QuizSubmitAnswer,
  QuizSubmitResult,
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
