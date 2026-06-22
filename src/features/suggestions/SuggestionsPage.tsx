import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Plus, MessageSquare, RefreshCw, ThumbsUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { useSuggestions } from './hooks/useSuggestions'
import { useSuggestionFilters } from './hooks/useSuggestionFilters'
import { SuggestionCard } from './components/SuggestionCard'
import { SuggestionsToolbar } from './components/SuggestionsToolbar'
import { SuggestionsEmptyState } from './components/SuggestionsEmptyState'
import { SuggestionsListSkeleton } from './components/SuggestionsListSkeleton'
import { SuggestionFormDialog } from './components/SuggestionFormDialog'
import type { CreateSuggestionPayload } from '@/services/suggestion.service'

const PAGE_SIZE = 8

export function SuggestionsPage() {
  const reduced = useReducedMotion()
  const userId = useAuthStore((s) => s.user?.id)
  const { data: suggestions = [], isLoading, isError, refetch, createMutation, voteMutation } = useSuggestions()
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    q, type, status, sort,
    setQ, setType, setStatus, setSort,
    clearFilters, hasActiveFilters, activeFilterCount,
    filtered, availableTypes, availableStatuses, groupByTime,
  } = useSuggestionFilters(suggestions)

  const doneCount = useMemo(() => suggestions.filter((s) => s.status === 'done').length, [suggestions])
  const pendingCount = useMemo(
    () => suggestions.filter((s) => s.status === 'pending' || s.status === 'in_review').length,
    [suggestions],
  )

  const heroStats: HeroStat[] = [
    { icon: MessageSquare, value: suggestions.length, label: suggestions.length === 1 ? 'sugestão' : 'sugestões', tone: 'muted' },
    { icon: ThumbsUp, value: pendingCount, label: 'em aberto', tone: 'primary' },
    { icon: CheckCircle2, value: doneCount, label: 'concluídas', tone: 'green' },
  ]

  // Client-side incremental rendering (explicit "load more", not infinite scroll).
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q, type, status, sort])

  const visibleItems = filtered.slice(0, visible)
  const groups = groupByTime(visibleItems)
  const remaining = filtered.length - visibleItems.length

  async function handleSave(payload: CreateSuggestionPayload) {
    await createMutation.mutateAsync(payload)
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHero
        icon={MessageSquare}
        title="Sugestões"
        subtitle="Envie ideias, melhorias ou reporte problemas nos aplicativos."
        stats={suggestions.length > 0 ? heroStats : undefined}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" aria-hidden />
              Nova sugestão
            </Button>
          </>
        }
      />

      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">Não foi possível carregar as sugestões.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading ? (
        <SuggestionsListSkeleton />
      ) : suggestions.length === 0 ? (
        <SuggestionsEmptyState filtered={false} onCreate={() => setDialogOpen(true)} />
      ) : (
        <>
          <SuggestionsToolbar
            q={q}
            type={type}
            status={status}
            sort={sort}
            availableTypes={availableTypes}
            availableStatuses={availableStatuses}
            activeFilterCount={activeFilterCount}
            setQ={setQ}
            setType={setType}
            setStatus={setStatus}
            setSort={setSort}
          />

          {filtered.length === 0 ? (
            <SuggestionsEmptyState filtered onClearFilters={hasActiveFilters ? clearFilters : undefined} />
          ) : (
            <div className="flex flex-col gap-7">
              {groups.map((group) => (
                <section key={group.bucket} aria-label={group.label} className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                    <span className="ml-1.5 font-semibold text-muted-foreground/70">({group.items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {group.items.map((s, i) => (
                      <motion.div
                        key={s.id}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: reduced ? 0 : Math.min(i * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                      >
                        <SuggestionCard
                          suggestion={s}
                          mine={s.userId === userId}
                          onVote={(id, value) => voteMutation.mutate({ id, value })}
                        />
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

      <SuggestionFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSubmitting={createMutation.isPending}
      />
    </div>
  )
}
