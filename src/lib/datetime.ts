/** Shared, locale-aware date helpers used across feature lists. */

export function relativeTime(date: Date, now = Date.now()): string {
  const diffMs = now - date.getTime()
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (diffMs < minute) return 'agora há pouco'
  if (diffMs < hour) return `há ${Math.floor(diffMs / minute)} min`
  if (diffMs < day) return `há ${Math.floor(diffMs / hour)} h`
  const days = Math.floor(diffMs / day)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  if (days < 30) return `há ${Math.floor(days / 7)} sem.`
  if (days < 365) return `há ${Math.floor(days / 30)} meses`
  return `há ${Math.floor(days / 365)} ano(s)`
}

export function formatFullDate(date: Date): string {
  const formatted = date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export type TimeBucket = 'today' | 'week' | 'older'

export const TIME_BUCKET_LABELS: Record<TimeBucket, string> = {
  today: 'Hoje',
  week: 'Esta semana',
  older: 'Mais antigos',
}

export function timeBucket(date: Date, now = Date.now()): TimeBucket {
  const diffDays = Math.floor((now - date.getTime()) / 86_400_000)
  if (diffDays < 1) return 'today'
  if (diffDays < 7) return 'week'
  return 'older'
}
