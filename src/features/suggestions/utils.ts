import { Lightbulb, TrendingUp, Bug, CircleDot, type LucideIcon } from 'lucide-react'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

export interface SuggestionTypeMeta {
  label: string
  icon: LucideIcon
  /** Left accent bar — token color only. */
  accent: string
  /** Icon chip background + text — token-based soft tint. */
  iconChip: string
  /** Category badge — token-based soft tint. */
  badge: string
}

/**
 * Token-based only (primary = âmbar, destructive, muted). No hardcoded hex,
 * no blue/purple/pink.
 */
export const SUGGESTION_TYPE_META: Record<SuggestionType, SuggestionTypeMeta> = {
  feature: {
    label: 'Funcionalidade',
    icon: Lightbulb,
    accent: 'bg-primary',
    iconChip: 'bg-primary/12 text-primary',
    badge: 'bg-primary/10 text-primary',
  },
  improvement: {
    label: 'Melhoria',
    icon: TrendingUp,
    accent: 'bg-foreground/40',
    iconChip: 'bg-muted text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
  bug: {
    label: 'Bug',
    icon: Bug,
    accent: 'bg-destructive',
    iconChip: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
  other: {
    label: 'Outro',
    icon: CircleDot,
    accent: 'bg-border',
    iconChip: 'bg-muted text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
}

export function getSuggestionTypeMeta(type: SuggestionType): SuggestionTypeMeta {
  return SUGGESTION_TYPE_META[type] ?? SUGGESTION_TYPE_META.other
}

export interface SuggestionStatusMeta {
  label: string
  badge: string
}

export const SUGGESTION_STATUS_META: Record<SuggestionStatus, SuggestionStatusMeta> = {
  pending:   { label: 'Aguardando', badge: 'bg-primary/10 text-primary' },
  in_review: { label: 'Em análise', badge: 'bg-muted text-muted-foreground' },
  done:      { label: 'Concluída',  badge: 'bg-success/10 text-success' },
  rejected:  { label: 'Encerrada',  badge: 'bg-muted text-muted-foreground' },
}

export function getSuggestionStatusMeta(status: SuggestionStatus): SuggestionStatusMeta {
  return SUGGESTION_STATUS_META[status] ?? SUGGESTION_STATUS_META.pending
}
