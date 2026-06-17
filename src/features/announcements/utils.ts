import { Info, AlertTriangle, Siren, CheckCircle2, type LucideIcon } from 'lucide-react'
import type { AnnouncementType } from '@/types/enums'
import type { AnnouncementModel } from '@/types/models'

export interface AnnouncementTypeMeta {
  label: string
  icon: LucideIcon
  /** Left accent bar — solid token color. */
  accent: string
  /** Icon chip background + text — token-based soft tint. */
  iconChip: string
  /** Category badge — token-based soft tint. */
  badge: string
  /** warning/urgent are surfaced as "importantes". */
  important: boolean
}

/**
 * All classes reference Design-System tokens only (primary = âmbar, destructive,
 * success, muted). No hardcoded hex, no blue/purple/pink.
 */
export const ANNOUNCEMENT_TYPE_META: Record<AnnouncementType, AnnouncementTypeMeta> = {
  info: {
    label: 'Informativo',
    icon: Info,
    accent: 'bg-border',
    iconChip: 'bg-muted text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
    important: false,
  },
  warning: {
    label: 'Aviso',
    icon: AlertTriangle,
    accent: 'bg-primary',
    iconChip: 'bg-primary/12 text-primary',
    badge: 'bg-primary/10 text-primary',
    important: true,
  },
  urgent: {
    label: 'Urgente',
    icon: Siren,
    accent: 'bg-destructive',
    iconChip: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
    important: true,
  },
  success: {
    label: 'Concluído',
    icon: CheckCircle2,
    accent: 'bg-success',
    iconChip: 'bg-success/10 text-success',
    badge: 'bg-success/10 text-success',
    important: false,
  },
}

export function getTypeMeta(type: AnnouncementType): AnnouncementTypeMeta {
  return ANNOUNCEMENT_TYPE_META[type] ?? ANNOUNCEMENT_TYPE_META.info
}

export function isImportant(a: AnnouncementModel): boolean {
  return getTypeMeta(a.type).important
}

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
