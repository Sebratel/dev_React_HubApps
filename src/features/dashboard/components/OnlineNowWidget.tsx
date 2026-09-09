import { useQuery } from '@tanstack/react-query'
import { Wifi, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { getPresence } from '@/services/user.service'
import type { PresenceUser } from '@/services/user.service'
import { useAuthStore } from '@/stores/auth.store'

// ─── Card de cada pessoa online ───────────────────────────────────────────────

function PresenceCard({ person }: { person: PresenceUser }) {
  const firstName = person.name.split(' ')[0]

  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      {/* Avatar com indicador verde */}
      <div className="relative shrink-0">
        <UserAvatar name={person.name} photoUrl={person.photoUrl} size="sm" />
        <span
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-card"
          aria-hidden
        />
      </div>

      {/* Nome + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">{firstName}</p>
        {person.status ? (
          <p className="text-xs text-muted-foreground truncate leading-tight">{person.status}</p>
        ) : (
          <p className="text-xs text-green-600 dark:text-green-400 leading-tight">Online</p>
        )}
      </div>
    </li>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function OnlineNowWidget() {
  const user = useAuthStore((s) => s.user)

  const { data: presence = [], isLoading } = useQuery({
    queryKey: ['users', 'presence'],
    queryFn:  getPresence,
    // Atualiza a cada 30s para refletir quem entrou/saiu
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  })

  // Ordena: o próprio usuário por último (prioriza colegas)
  const sorted = [...presence].sort((a, b) =>
    a.id === user?.id ? 1 : b.id === user?.id ? -1 : 0
  )

  // Mostra até 5 pessoas para não estourar o widget
  const displayed = sorted.slice(0, 5)
  const extra     = presence.length - displayed.length

  return (
    <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
          <Wifi className="h-3.5 w-3.5 text-green-600 dark:text-green-400" aria-hidden />
        </div>
        <h2 className="text-sm font-semibold text-foreground">Online Agora</h2>
        {presence.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden />
            {presence.length} {presence.length === 1 ? 'pessoa' : 'pessoas'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 min-h-[180px] flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center px-5">
            <span className="text-3xl select-none" aria-hidden>😴</span>
            <p className="text-sm font-medium text-foreground">Ninguém online agora</p>
            <p className="text-xs text-muted-foreground">Você é o primeiro do dia!</p>
          </div>
        ) : (
          <>
            <ul
              className="flex flex-col divide-y divide-border"
              role="list"
              aria-label="Pessoas online agora"
            >
              {displayed.map((p) => (
                <PresenceCard key={p.id} person={p} />
              ))}
            </ul>
            {extra > 0 && (
              <p className="px-5 py-2.5 text-xs text-muted-foreground border-t border-border">
                +{extra} {extra === 1 ? 'pessoa' : 'pessoas'} online
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
