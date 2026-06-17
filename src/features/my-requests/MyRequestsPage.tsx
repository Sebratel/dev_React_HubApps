import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Clock3, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useAuthStore } from '@/stores/auth.store'
import { getUserAccessRequests } from '@/services/access-request.service'
import { useRequestFilters } from './hooks/useRequestFilters'
import { RequestCard } from './components/RequestCard'
import { RequestsToolbar } from './components/RequestsToolbar'
import { RequestsEmptyState } from './components/RequestsEmptyState'
import { RequestsListSkeleton } from './components/RequestsListSkeleton'

const PAGE_SIZE = 8

export function MyRequestsPage() {
  const user = useAuthStore((s) => s.user)
  const reduced = useReducedMotion()

  const { data: requests = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['access-requests', 'me'],
    queryFn: () => getUserAccessRequests(user?.id ?? ''),
    enabled: !!user,
    staleTime: 60_000,
  })

  const {
    q, status, sort,
    setQ, setStatus, setSort,
    clearFilters, hasActiveFilters, activeFilterCount,
    filtered, availableStatuses, groupByTime,
  } = useRequestFilters(requests)

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests])
  const approved = useMemo(() => requests.filter((r) => r.status === 'approved').length, [requests])
  const rejected = useMemo(() => requests.filter((r) => r.status === 'rejected').length, [requests])

  const heroStats: HeroStat[] = [
    { icon: Clock3,       value: pending,  label: 'em análise', tone: 'amber' },
    { icon: CheckCircle2, value: approved, label: 'aprovadas',  tone: 'green' },
    { icon: XCircle,      value: rejected, label: 'rejeitadas', tone: 'red' },
  ]

  // Client-side incremental rendering (explicit "load more", not infinite scroll).
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q, status, sort])

  const visibleItems = filtered.slice(0, visible)
  const groups = groupByTime(visibleItems)
  const remaining = filtered.length - visibleItems.length

  if (!user) return null

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHero
        icon={ClipboardList}
        title="Minhas solicitações"
        subtitle="Histórico dos seus pedidos de acesso a aplicativos."
        stats={requests.length > 0 ? heroStats : undefined}
      />

      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">Não foi possível carregar as solicitações.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading ? (
        <RequestsListSkeleton />
      ) : requests.length === 0 ? (
        <RequestsEmptyState filtered={false} />
      ) : (
        <>
          <RequestsToolbar
            q={q}
            status={status}
            sort={sort}
            availableStatuses={availableStatuses}
            activeFilterCount={activeFilterCount}
            setQ={setQ}
            setStatus={setStatus}
            setSort={setSort}
          />

          {filtered.length === 0 ? (
            <RequestsEmptyState filtered onClearFilters={hasActiveFilters ? clearFilters : undefined} />
          ) : (
            <div className="flex flex-col gap-7">
              {groups.map((group) => (
                <section key={group.bucket} aria-label={group.label} className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                    <span className="ml-1.5 font-semibold text-muted-foreground/70">({group.items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {group.items.map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: reduced ? 0 : Math.min(i * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                      >
                        <RequestCard req={r} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))}

              {remaining > 0 && (
                <div className="flex justify-center pt-1">
                  <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Carregar mais ({remaining})
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
