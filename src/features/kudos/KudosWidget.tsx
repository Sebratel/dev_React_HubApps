import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Award, Plus, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { getKudosFeed } from '@/services/kudos.service'
import { SendKudoDialog } from './SendKudoDialog'
import type { KudoModel } from '@/types/models'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2)  return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  if (days < 7)   return `${days}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Kudo item ────────────────────────────────────────────────────────────────

function KudoItem({ kudo }: { kudo: KudoModel }) {
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      {/* Stacked avatars: from → to */}
      <div className="flex shrink-0 -space-x-2 mt-0.5">
        <UserAvatar name={kudo.fromName} photoUrl={kudo.fromPhoto} size="xs" className="ring-2 ring-card" />
        <UserAvatar name={kudo.toName}   photoUrl={kudo.toPhoto}   size="xs" className="ring-2 ring-card" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug">
          <span className="font-semibold">{kudo.fromName.split(' ')[0]}</span>
          <span className="text-muted-foreground mx-1">→</span>
          <span className="font-semibold">{kudo.toName.split(' ')[0]}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
          {kudo.message}
        </p>
      </div>

      {/* Timestamp */}
      <time
        className="text-[11px] text-muted-foreground/70 shrink-0 mt-0.5"
        dateTime={kudo.createdAt.toISOString()}
        title={kudo.createdAt.toLocaleString('pt-BR')}
      >
        {timeAgo(kudo.createdAt)}
      </time>
    </li>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function KudosWidget() {
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: kudos = [], isLoading } = useQuery({
    queryKey:   ['kudos', 'feed'],
    queryFn:    getKudosFeed,
    staleTime:  60_000,
    refetchOnWindowFocus: true,
  })

  const displayed = kudos.slice(0, 5)

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Award className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Kudos</h2>
          {kudos.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {kudos.length} recente{kudos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="h-7 px-2.5 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Enviar
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[200px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10 text-center px-5">
            <span className="text-3xl select-none" aria-hidden>🏆</span>
            <p className="text-sm font-medium text-foreground">Nenhum kudo ainda</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Seja o primeiro a reconhecer o trabalho de alguém
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="list" aria-label="Últimos kudos">
            {displayed.map((kudo) => (
              <KudoItem key={kudo.id} kudo={kudo} />
            ))}
          </ul>
        )}
      </div>

      <SendKudoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
