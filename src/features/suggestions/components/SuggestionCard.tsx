import { useState } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/UserAvatar'
import type { SuggestionModel, VoteValue } from '@/services/suggestion.service'
import { getSuggestionTypeMeta, getSuggestionStatusMeta } from '../utils'
import { SuggestionComments } from './SuggestionComments'

interface SuggestionCardProps {
  suggestion: SuggestionModel
  mine: boolean
  onVote: (id: string, value: VoteValue) => void
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function SuggestionCard({ suggestion: s, mine, onVote }: SuggestionCardProps) {
  const type = getSuggestionTypeMeta(s.type)
  const status = getSuggestionStatusMeta(s.status)
  const TypeIcon = type.icon
  const [commentsOpen, setCommentsOpen] = useState(false)

  const scoreTone =
    s.score > 0 ? 'text-success' : s.score < 0 ? 'text-destructive' : 'text-muted-foreground'
  const scoreLabel = s.score > 0 ? `+${s.score}` : `${s.score}`

  function handleVote(value: 1 | -1) {
    onVote(s.id, (s.myVote === value ? 0 : value) as VoteValue)
  }

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200',
        'hover:border-primary/30 hover:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.30)]',
        s.status === 'rejected' && 'opacity-80',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', type.accent)} aria-hidden />

      <div className="flex flex-col lg:flex-row">
        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 pl-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', status.badge)}>
              {status.label}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide', type.badge)}>
              <TypeIcon className="h-3 w-3" aria-hidden />
              {type.label}
            </span>
            {s.appName && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {s.appName}
              </span>
            )}
            {mine && (
              <span className="rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                Sua
              </span>
            )}
          </div>

          {/* Title + body */}
          <div>
            <h3 className="text-lg font-bold leading-snug text-foreground">{s.title}</h3>
            {s.body && (
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            )}
          </div>

          {/* Author */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserAvatar name={s.userName} size="xs" />
            <span>
              Enviado por <span className="font-semibold text-foreground">{s.userName}</span> em {formatDateTime(s.createdAt)}
            </span>
          </div>

          {/* Footer: supporters + comments */}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              {s.upVoterNames.length > 0 && (
                <div className="flex -space-x-2">
                  {s.upVoterNames.slice(0, 3).map((name) => (
                    <UserAvatar key={name} name={name} size="xs" className="ring-2 ring-card" />
                  ))}
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {s.upCount > 0
                  ? `${s.upCount} ${s.upCount === 1 ? 'pessoa apoiou' : 'pessoas apoiaram'}`
                  : 'Nenhum apoio ainda'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCommentsOpen((o) => !o)}
              aria-expanded={commentsOpen}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
              {s.commentCount} {s.commentCount === 1 ? 'comentário' : 'comentários'}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', commentsOpen && 'rotate-180')} aria-hidden />
            </button>
          </div>

          <SuggestionComments suggestionId={s.id} open={commentsOpen} />
        </div>

        {/* Side panel */}
        <div className="flex shrink-0 flex-row items-stretch gap-3 border-t border-border bg-muted/20 p-4 lg:w-56 lg:flex-col lg:border-l lg:border-t-0">
          {/* Score */}
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card px-3 py-2 lg:flex-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Score</span>
            <span className={cn('text-2xl font-extrabold tabular-nums', scoreTone)}>{scoreLabel}</span>
          </div>

          {/* Status */}
          <div className="hidden flex-col gap-1 lg:flex">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span>
            <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold', status.badge)}>
              {status.label}
            </span>
          </div>

          {/* Vote buttons */}
          <div className="flex flex-1 flex-col gap-2 lg:flex-none">
            <button
              type="button"
              onClick={() => handleVote(1)}
              aria-pressed={s.myVote === 1}
              aria-label="Apoiar"
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.myVote === 1
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-1.5"><ThumbsUp className="h-4 w-4" aria-hidden /> Apoiar</span>
              <span className="tabular-nums">{s.upCount}</span>
            </button>
            <button
              type="button"
              onClick={() => handleVote(-1)}
              aria-pressed={s.myVote === -1}
              aria-label="Não apoiar"
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                s.myVote === -1
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-border bg-card text-muted-foreground hover:border-destructive/40 hover:text-foreground',
              )}
            >
              <span className="flex items-center gap-1.5"><ThumbsDown className="h-4 w-4" aria-hidden /> Não apoiar</span>
              <span className="tabular-nums">{s.downCount}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
