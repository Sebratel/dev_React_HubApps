// Mirrors Flutter's relative time display logic from DashboardController.
// Thresholds: < 1 min → "agora"; < 60 min → "X min atrás";
//             < 24 h → "X h atrás"; else → "X d atrás"
// null / empty → "Acesso recente"

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value || value.trim() === '') return 'Acesso recente'

  const date = new Date(value)
  if (isNaN(date.getTime())) return 'Acesso recente'

  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin} min atrás`
  if (diffHours < 24) return `${diffHours} h atrás`
  return `${diffDays} d atrás`
}
