import { useQuery } from '@tanstack/react-query'
import { ClipboardList, CheckCircle2, XCircle, Clock3 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { getUserAccessRequests } from '@/services/access-request.service'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { AccessRequestModel } from '@/types/models'

const STATUS_CONFIG = {
  pending: {
    label: 'Aguardando',
    icon: Clock3,
    badge: 'bg-amber-100 text-amber-800',
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    badge: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Rejeitado',
    icon: XCircle,
    badge: 'bg-red-100 text-destructive',
  },
} as const

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function RequestCard({ req }: { req: AccessRequestModel }) {
  const cfg = STATUS_CONFIG[req.status]
  const Icon = cfg.icon

  return (
    <article className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-sm text-foreground leading-tight">{req.appName}</p>
        <span
          className={cn(
            'shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
            cfg.badge
          )}
        >
          <Icon className="h-3 w-3" aria-hidden />
          {cfg.label}
        </span>
      </div>

      {req.reason && (
        <p className="text-xs text-muted-foreground line-clamp-2" title={req.reason}>
          "{req.reason}"
        </p>
      )}

      {req.status === 'rejected' && req.reviewNote && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-[11px] text-muted-foreground mb-0.5">Motivo da rejeição</p>
          <p className="text-xs text-foreground">{req.reviewNote}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
        <span>Solicitado em {formatDate(req.requestedAt)}</span>
        {req.reviewedAt && (
          <span>
            {req.status === 'approved' ? 'Aprovado' : 'Revisado'} em {formatDate(req.reviewedAt)}
          </span>
        )}
      </div>
    </article>
  )
}

function RequestsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  )
}

export function MyRequestsPage() {
  const user = useAuthStore((s) => s.user)

  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['access-requests', 'me'],
    queryFn: () => getUserAccessRequests(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })

  const pending  = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  if (!user) return null

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minhas solicitações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico dos seus pedidos de acesso a aplicativos.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar solicitações.{' '}
          <button className="underline underline-offset-2" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <RequestsSkeleton />
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-muted-foreground">
          <ClipboardList className="h-10 w-10 opacity-30" aria-hidden />
          <p className="text-sm font-medium">Nenhuma solicitação ainda.</p>
          <p className="text-xs">
            Seus pedidos de acesso a aplicativos aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {pending.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Em análise ({pending.length})
              </h2>
              <div className="flex flex-col gap-3">
                {pending.map((r) => <RequestCard key={r.id} req={r} />)}
              </div>
            </section>
          )}

          {resolved.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Histórico ({resolved.length})
              </h2>
              <div className="flex flex-col gap-3">
                {resolved.map((r) => <RequestCard key={r.id} req={r} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
