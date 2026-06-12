import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useAnnouncements } from './hooks/useAnnouncements'
import { AnnouncementCard } from './components/AnnouncementCard'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotificationsStore } from '@/stores/notifications.store'

function AnnouncementsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function AnnouncementsPage() {
  const { data: announcements = [], isLoading, isError } = useAnnouncements()
  const markAnnouncementsRead = useNotificationsStore((s) => s.markAnnouncementsRead)

  useEffect(() => {
    if (!isLoading) markAnnouncementsRead()
  }, [isLoading, markAnnouncementsRead])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avisos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Comunicados e informações da empresa para a equipe.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar avisos. Tente recarregar a página.
        </div>
      )}

      {isLoading ? (
        <AnnouncementsSkeleton />
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <Bell className="h-10 w-10 opacity-30" aria-hidden />
          <p className="text-sm font-medium">Nenhum aviso no momento.</p>
          <p className="text-xs">Novos comunicados aparecerão aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 max-w-2xl">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))}
        </div>
      )}
    </div>
  )
}
