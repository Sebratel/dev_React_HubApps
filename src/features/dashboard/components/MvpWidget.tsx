import { useQuery } from '@tanstack/react-query'
import { Trophy, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { getWeeklyMvp } from '@/services/kudos.service'
import type { MvpUser } from '@/services/kudos.service'
import { useAuthStore } from '@/stores/auth.store'

// ─── Medalhas e estilos por posição ──────────────────────────────────────────

const RANK_CONFIG = [
  { medal: '🥇', ring: 'ring-2 ring-amber-400',  label: '1°', labelClass: 'text-amber-500 font-bold' },
  { medal: '🥈', ring: 'ring-2 ring-slate-300',  label: '2°', labelClass: 'text-slate-400 font-semibold' },
  { medal: '🥉', ring: 'ring-2 ring-orange-400', label: '3°', labelClass: 'text-orange-500 font-semibold' },
]

// ─── Item do pódio ────────────────────────────────────────────────────────────

function MvpItem({ user, rank }: { user: MvpUser; rank: number }) {
  const cfg = RANK_CONFIG[rank]
  const firstName = user.name.split(' ')[0]

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      {/* Avatar com medal overlay */}
      <div className="relative shrink-0">
        <UserAvatar
          name={user.name}
          photoUrl={user.photoUrl}
          size="sm"
          className={cfg.ring}
        />
        <span
          className="absolute -top-1.5 -right-1.5 text-sm leading-none select-none"
          aria-hidden
        >
          {cfg.medal}
        </span>
      </div>

      {/* Nome + posição */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{firstName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {user.name.split(' ').slice(1).join(' ') || ''}
        </p>
      </div>

      {/* Contagem de kudos */}
      <div className="shrink-0 text-right">
        <p className={`text-sm tabular-nums ${cfg.labelClass}`}>
          {user.kudoCount}
        </p>
        <p className="text-[10px] text-muted-foreground">
          kudo{user.kudoCount !== 1 ? 's' : ''}
        </p>
      </div>
    </li>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function MvpWidget() {
  const user = useAuthStore((s) => s.user)

  const { data: mvp = [], isLoading } = useQuery({
    queryKey: ['kudos', 'mvp'],
    queryFn:  getWeeklyMvp,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  })

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-foreground">MVP da Semana</h2>
        <span className="text-[11px] text-muted-foreground ml-auto">últimos 7 dias</span>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[180px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : mvp.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center px-5">
            <span className="text-3xl select-none" aria-hidden>🏆</span>
            <p className="text-sm font-medium text-foreground">Nenhum kudo esta semana</p>
            <p className="text-xs text-muted-foreground leading-snug">
              Seja o primeiro a reconhecer alguém!
            </p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border" role="list" aria-label="MVP da semana">
            {mvp.map((u, i) => (
              <MvpItem key={u.id} user={u} rank={i} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
