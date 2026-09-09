import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import { BarChart2, Plus, Loader2, X } from 'lucide-react'
import { getPolls, votePoll, closePoll } from '@/services/polls.service'
import type { Poll } from '@/services/polls.service'
import { CreatePollModal } from './CreatePollModal'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Card de enquete ──────────────────────────────────────────────────────────

function PollCard({ poll, onVote, onClose }: {
  poll: Poll
  onVote: (pollId: string, optionId: string) => void
  onClose: (pollId: string) => void
}) {
  const user     = useAuthStore((s) => s.user)
  const hasVoted = !!poll.myVote
  const isOwner  = poll.creator.id === user?.id

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
      {/* Question + close btn */}
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm font-semibold text-foreground leading-snug">{poll.question}</p>
        {isOwner && (
          <button
            onClick={() => onClose(poll.id)}
            title="Encerrar enquete"
            className="shrink-0 h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {poll.options.map((opt) => {
          const isMyVote = poll.myVote === opt.id
          return (
            <button
              key={opt.id}
              onClick={() => !hasVoted && onVote(poll.id, opt.id)}
              disabled={hasVoted}
              className={cn(
                'relative w-full rounded-lg overflow-hidden text-left px-3 py-2 text-sm transition-all',
                hasVoted
                  ? 'cursor-default'
                  : 'hover:bg-muted border border-border bg-card',
                isMyVote && 'border-primary/60 bg-primary/5 dark:bg-primary/10'
              )}
            >
              {/* Barra de progresso (após votar) */}
              {hasVoted && (
                <span
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-lg transition-all duration-700',
                    isMyVote ? 'bg-primary/20' : 'bg-muted'
                  )}
                  style={{ width: `${opt.percent}%` }}
                  aria-hidden
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className={cn('leading-tight', isMyVote && 'font-semibold text-primary')}>
                  {opt.text}
                </span>
                {hasVoted && (
                  <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    {opt.percent}%
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground leading-tight">
        {poll.totalVotes} {poll.totalVotes === 1 ? 'voto' : 'votos'} · por {poll.creator.name.split(' ')[0]}
        {poll.closesAt && (
          <> · encerra em {new Date(poll.closesAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</>
        )}
      </p>
    </div>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function PollsWidget() {
  const user = useAuthStore((s) => s.user)
  const qc   = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: polls = [], isLoading } = useQuery({
    queryKey:  ['polls'],
    queryFn:   getPolls,
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled:   !!user,
  })

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(pollId, optionId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['polls'] }),
  })

  const closeMutation = useMutation({
    mutationFn: (pollId: string) => closePoll(pollId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['polls'] }),
  })

  return (
    <>
      <div className="rounded-2xl border border-border bg-card flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <BarChart2 className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Enquetes</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline font-medium"
            aria-label="Criar nova enquete"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Criar
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3 p-4 min-h-[180px]">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : polls.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="text-3xl select-none" aria-hidden>📊</span>
              <p className="text-sm font-medium text-foreground">Nenhuma enquete ativa</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Crie uma para saber a opinião da equipe!
              </p>
            </div>
          ) : (
            polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                onVote={(pId, oId) => voteMutation.mutate({ pollId: pId, optionId: oId })}
                onClose={(pId) => closeMutation.mutate(pId)}
              />
            ))
          )}
        </div>
      </div>

      {/* Modal de criação */}
      <AnimatePresence>
        {showCreate && (
          <CreatePollModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              void qc.invalidateQueries({ queryKey: ['polls'] })
              setShowCreate(false)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
