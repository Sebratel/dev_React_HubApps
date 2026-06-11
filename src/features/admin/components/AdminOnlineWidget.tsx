import { useQuery } from '@tanstack/react-query'
import { UserAvatar } from '@/components/UserAvatar'
import { PROFILE_LABEL } from '@/constants/profiles'
import { getOnlineUsers } from '@/services/admin/admin-presence.service'
import { cn } from '@/lib/utils'

function ProfileBadge({ profile }: { profile: string }) {
  const label = PROFILE_LABEL[profile] ?? profile
  if (!label) return null
  return (
    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm leading-tight shrink-0">
      {label}
    </span>
  )
}

export function AdminOnlineWidget() {
  const { data: users = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'users', 'online'],
    queryFn:  getOnlineUsers,
    refetchInterval: 60_000,
    staleTime:       30_000,
  })

  const updatedAgo = dataUpdatedAt
    ? Math.round((Date.now() - dataUpdatedAt) / 1000)
    : null

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 flex flex-col"
      aria-label="Usuários online agora"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">
            {isLoading ? 'Online' : `${users.length} online agora`}
          </h2>
        </div>
        {updatedAgo !== null && !isLoading && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            há {updatedAgo < 60 ? `${updatedAgo}s` : `${Math.floor(updatedAgo / 60)}min`}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5 flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 h-3.5 bg-muted rounded animate-pulse" />
              <div className="w-16 h-3 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">Nenhum usuário ativo.</p>
        </div>
      ) : (
        <div
          className={cn(
            'flex flex-col gap-2 overflow-y-auto',
            users.length > 8 && 'max-h-64'
          )}
          role="list"
          aria-label="Usuários online"
        >
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2" role="listitem">
              <UserAvatar name={u.name} photoUrl={u.photoUrl} size="xs" />
              <span className="text-sm text-foreground truncate flex-1 leading-tight min-w-0">
                {u.name}
              </span>
              <ProfileBadge profile={u.profile} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
