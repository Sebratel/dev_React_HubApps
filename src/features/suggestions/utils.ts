import { Lightbulb, TrendingUp, Bug, CircleDot, type LucideIcon } from 'lucide-react'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

export interface SuggestionTypeMeta {
  label: string
  icon: LucideIcon
  iconChip: string
  badge: string
}

export const SUGGESTION_TYPE_META: Record<SuggestionType, SuggestionTypeMeta> = {
  feature: {
    label: 'Funcionalidade',
    icon: Lightbulb,
    iconChip: 'bg-primary/12 text-primary',
    badge: 'bg-primary/10 text-primary',
  },
  improvement: {
    label: 'Melhoria',
    icon: TrendingUp,
    iconChip: 'bg-muted text-muted-foreground',
    badge: 'bg-muted text-muted-foreground',
  },
  bug: {
    label: 'Bug',
    icon: Bug,
    iconChip: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
  other: {
    label: 'Outro',
    icon: CircleDot,
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
  /** Faixa lateral do cartão — mesma família de cor do badge de status. */
  accent: string
}

export const SUGGESTION_STATUS_META: Record<SuggestionStatus, SuggestionStatusMeta> = {
  pending: {
    label: 'Aguardando',
    badge: 'border-amber-200 bg-amber-50 text-amber-800',
    accent: 'bg-amber-400',
  },
  in_review: {
    label: 'Em análise',
    badge: 'border-stone-300 bg-stone-100 text-stone-700',
    accent: 'bg-stone-400',
  },
  in_development: {
    label: 'Em desenvolvimento',
    badge: 'border-sky-200 bg-sky-50 text-sky-800',
    accent: 'bg-sky-500',
  },
  done: {
    label: 'Concluída',
    badge: 'border-green-200 bg-green-50 text-green-700',
    accent: 'bg-green-500',
  },
  rejected: {
    label: 'Encerrada',
    badge: 'border-border bg-muted text-muted-foreground',
    accent: 'bg-muted-foreground/45',
  },
}

export const SUGGESTION_STATUS_ORDER: SuggestionStatus[] = [
  'pending',
  'in_review',
  'in_development',
  'done',
  'rejected',
]

export function getSuggestionStatusMeta(status: SuggestionStatus): SuggestionStatusMeta {
  return SUGGESTION_STATUS_META[status] ?? SUGGESTION_STATUS_META.pending
}
