import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  RefreshCw, Pencil, MessageSquare, Clock3, CheckCircle2,
  Search, ThumbsUp, MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAdminSuggestions } from './hooks/useAdminSuggestions'
import { SuggestionStatusDialog } from './components/SuggestionStatusDialog'
import type { SuggestionModel } from '@/services/suggestion.service'
import { getSuggestionStatusMeta, SUGGESTION_STATUS_ORDER } from '@/features/suggestions/utils'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<SuggestionType, string> = {
  feature:     'border-amber-200  bg-amber-50   text-amber-800',
  improvement: 'border-stone-300  bg-stone-100  text-stone-700',
  bug:         'border-red-200    bg-red-50     text-red-700',
  other:       'border-gray-200   bg-gray-50    text-gray-600',
}

const TYPE_LABEL: Record<SuggestionType, string> = {
  feature:     'Funcionalidade',
  improvement: 'Melhoria',
  bug:         'Bug',
  other:       'Outro',
}

const STATUS_FILTERS: { value: SuggestionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  ...SUGGESTION_STATUS_ORDER.map((value) => ({
    value,
    label: getSuggestionStatusMeta(value).label,
  })),
]

const AVATAR_PALETTE = [
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#EEEDFE', text: '#534AB7' },
  { bg: '#EAF3DE', text: '#3B6D11' },
]

function getAvatarColors(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

function formatError(err: unknown) {
  if (err instanceof ApiError) return err.message
  return 'Ocorreu um erro inesperado.'
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Insight panels ────────────────────────────────────────────────────────────

interface MiniBarProps {
  label: string
  value: number
  max: number
  color?: string
}

function MiniBar({ label, value, max, color = 'hsl(var(--primary))' }: MiniBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="flex-1 min-w-0 truncate text-[12px] text-muted-foreground">{label}</span>
      <div className="w-20 h-1.5 flex-shrink-0 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-5 flex-shrink-0 text-right text-[12px] font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}

// ── Suggestion card ───────────────────────────────────────────────────────────

interface SuggestionCardProps {
  s: SuggestionModel
  onEdit: (s: SuggestionModel) => void
  index: number
  reduced: boolean
}

function SuggestionCard({ s, onEdit, index, reduced }: SuggestionCardProps) {
  const avatarColors = getAvatarColors(s.userName)
  const initials = getInitials(s.userName)

  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: s.status === 'rejected' ? 0.55 : 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, delay: reduced ? 0 : index * 0.04 }}
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
            style={{ background: avatarColors.bg, color: avatarColors.text }}
          >
            {initials}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">{s.userName}</p>
            <p className="text-[11px] text-muted-foreground">
              {s.sector ?? 'Setor não informado'}
              {s.appName ? ` · ${s.appName}` : ''} · {formatDate(s.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={cn('text-[11px] px-2 h-5', getSuggestionStatusMeta(s.status).badge)}>
            {getSuggestionStatusMeta(s.status).label}
          </Badge>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(s)}
            aria-label={`Atualizar status de "${s.title}"`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <p className="font-semibold text-[15px] leading-snug text-foreground mb-1.5">{s.title}</p>

      {s.body && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">{s.body}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn('text-[11px] px-2 h-5', TYPE_BADGE[s.type])}>
          {TYPE_LABEL[s.type]}
        </Badge>
        {s.score !== 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <ThumbsUp className="h-3 w-3" aria-hidden />
            {s.score > 0 ? `+${s.score}` : s.score}
          </span>
        )}
        {s.commentCount > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <MessageCircle className="h-3 w-3" aria-hidden />
            {s.commentCount}
          </span>
        )}
      </div>

      {s.adminNote && (
        <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-600" aria-hidden />
          <p className="text-[12px] leading-relaxed text-green-800">{s.adminNote}</p>
        </div>
      )}
    </motion.div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-full bg-muted flex-shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-24 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
        <div className="h-5 w-16 bg-muted rounded-full" />
      </div>
      <div className="h-4 bg-muted rounded w-2/3 mb-2" />
      <div className="h-3 bg-muted rounded w-full mb-1" />
      <div className="h-3 bg-muted rounded w-5/6 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminSuggestionsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: suggestions = [], isLoading, isError, refetch, updateStatusMutation } =
    useAdminSuggestions()

  const [statusFilter, setStatusFilter]   = useState<SuggestionStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<SuggestionModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const reduced = useReducedMotion()

  if (!user || !canAccessAdminDashboard(user)) return null

  const filtered = statusFilter === 'all'
    ? suggestions
    : suggestions.filter((s) => s.status === statusFilter)

  const counts = {
    pending:        suggestions.filter((s) => s.status === 'pending').length,
    in_review:      suggestions.filter((s) => s.status === 'in_review').length,
    in_development: suggestions.filter((s) => s.status === 'in_development').length,
    done:           suggestions.filter((s) => s.status === 'done').length,
    rejected:       suggestions.filter((s) => s.status === 'rejected').length,
  }

  // ── Insights ───────────────────────────────────────────────────────────────

  const topVoted = useMemo(() =>
    [...suggestions].sort((a, b) => b.score - a.score).slice(0, 3).filter((s) => s.score > 0),
    [suggestions])

  const avgResponseDays = useMemo(() => {
    const responded = suggestions.filter((s) => s.status !== 'pending')
    if (!responded.length) return null
    const total = responded.reduce((sum, s) =>
      sum + (s.updatedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24), 0)
    return (total / responded.length).toFixed(1)
  }, [suggestions])

  const responseRate = useMemo(() => {
    if (!suggestions.length) return 0
    return Math.round((suggestions.filter((s) => s.status !== 'pending').length / suggestions.length) * 100)
  }, [suggestions])

  const byApp = useMemo(() => {
    const map = new Map<string, number>()
    suggestions.filter((s) => s.appName).forEach((s) => {
      map.set(s.appName!, (map.get(s.appName!) ?? 0) + 1)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [suggestions])

  const showInsights = !isLoading && suggestions.length >= 2

  // ──────────────────────────────────────────────────────────────────────────

  function openEdit(s: SuggestionModel) {
    setEditing(s)
    setMutationError(null)
    setDialogOpen(true)
  }

  async function handleSave(status: SuggestionStatus, adminNote: string | null) {
    if (!editing) return
    setMutationError(null)
    try {
      await updateStatusMutation.mutateAsync({ id: editing.id, status, adminNote })
    } catch (err) {
      const msg = formatError(err)
      setMutationError(msg)
      throw new Error(msg)
    }
  }

  const heroStats: HeroStat[] = [
    { icon: Clock3,       value: counts.pending,   label: 'aguardando', tone: 'amber' },
    { icon: Search,       value: counts.in_review, label: 'em análise', tone: 'muted' },
    { icon: CheckCircle2, value: counts.done,      label: 'concluídas', tone: 'green' },
  ]

  return (
    <div className="flex w-full flex-col gap-5">
      <PageHero
        icon={MessageSquare}
        title="Sugestões"
        subtitle="Acompanhe e responda as sugestões da equipe."
        stats={!isLoading && suggestions.length > 0 ? heroStats : undefined}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Carregando...' : `${suggestions.length} sugestão${suggestions.length !== 1 ? 'ões' : ''} no total`}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
          Atualizar
        </Button>
      </div>

      {/* Error */}
      {(isError || mutationError) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutationError ?? 'Erro ao carregar sugestões. Tente atualizar.'}
        </div>
      )}

      {/* Insights panels */}
      {showInsights && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Métricas de processo */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="h-[3px]" style={{ background: 'hsl(var(--primary))' }} />
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Métricas de processo
              </p>
              <div className="flex gap-5">
                <div>
                  <p className="text-[22px] font-semibold leading-none text-foreground">
                    {avgResponseDays ?? '—'}
                    {avgResponseDays && <span className="text-xs font-normal text-muted-foreground ml-1">dias</span>}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">tempo médio de resposta</p>
                </div>
                <div className="w-px bg-border self-stretch" />
                <div>
                  <p className="text-[22px] font-semibold leading-none text-foreground">{responseRate}%</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">taxa de resposta</p>
                </div>
                <div className="w-px bg-border self-stretch" />
                <div>
                  <p className="text-[22px] font-semibold leading-none text-foreground">{counts.pending}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">no backlog</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mais votadas */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="h-[3px] bg-amber-400" />
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-4">
                <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Mais votadas
                </p>
              </div>
              {topVoted.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {topVoted.map((s, i) => (
                    <div key={s.id} className="flex items-start gap-2 min-w-0">
                      <span className="w-4 flex-shrink-0 text-[11px] font-semibold text-muted-foreground pt-0.5">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate leading-tight">{s.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">+{s.score} votos · {s.userName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">Nenhuma sugestão votada ainda.</p>
              )}
            </div>
          </div>

          {/* Por aplicativo */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="h-[3px] bg-stone-400" />
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-4">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Por aplicativo
                </p>
              </div>
              {byApp.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {byApp.map(([app, count]) => (
                    <MiniBar key={app} label={app} value={count} max={byApp[0][1]} />
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-muted-foreground">Sugestões ainda sem app associado.</p>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Filter chips with counts */}
      {!isLoading && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === 'all'
              ? suggestions.length
              : counts[f.value as SuggestionStatus] ?? 0
            const active = statusFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {f.label}
                <span className={cn(
                  'rounded-full px-1.5 text-[10px] font-semibold leading-5 min-w-[18px] text-center',
                  active ? 'bg-white/20 text-current' : 'bg-muted text-muted-foreground'
                )}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground/40" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">
            {statusFilter === 'all'
              ? 'Nenhuma sugestão recebida.'
              : `Nenhuma sugestão com status "${getSuggestionStatusMeta(statusFilter as SuggestionStatus).label}".`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((s, index) => (
              <SuggestionCard key={s.id} s={s} onEdit={openEdit} index={index} reduced={!!reduced} />
            ))}
          </AnimatePresence>
        </div>
      )}

      <SuggestionStatusDialog
        open={dialogOpen}
        suggestion={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSubmitting={updateStatusMutation.isPending}
      />
    </div>
  )
}
