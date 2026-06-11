import { useState } from 'react'
import { RefreshCw, Pencil, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { ApiError } from '@/types/api'
import { useAdminSuggestions } from './hooks/useAdminSuggestions'
import { SuggestionStatusDialog } from './components/SuggestionStatusDialog'
import type { SuggestionModel } from '@/services/suggestion.service'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'

const TYPE_BADGE: Record<SuggestionType, string> = {
  feature:     'border-amber-200  bg-amber-50   text-amber-800',
  improvement: 'border-stone-300  bg-stone-100  text-stone-700',
  bug:         'border-red-200    bg-red-50     text-red-700',
  other:       'border-gray-200   bg-gray-50    text-gray-600',
}

const TYPE_LABEL: Record<SuggestionType, string> = {
  feature:     'Funcionalidade',
  improvement: 'Melhoria',
  bug:         'Bug',
  other:       'Outro',
}

const STATUS_BADGE: Record<SuggestionStatus, string> = {
  pending:   'border-amber-200 bg-amber-50  text-amber-800',
  in_review: 'border-stone-300 bg-stone-100 text-stone-700',
  done:      'border-green-200 bg-green-50  text-green-700',
  rejected:  'border-border    bg-muted     text-muted-foreground',
}

const STATUS_LABEL: Record<SuggestionStatus, string> = {
  pending:   'Aguardando',
  in_review: 'Em análise',
  done:      'Concluída',
  rejected:  'Encerrada',
}

const STATUS_FILTERS: { value: SuggestionStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'Todas'       },
  { value: 'pending',   label: 'Aguardando'  },
  { value: 'in_review', label: 'Em análise'  },
  { value: 'done',      label: 'Concluídas'  },
  { value: 'rejected',  label: 'Encerradas'  },
]

function formatError(err: unknown) {
  if (err instanceof ApiError) return err.message
  return 'Ocorreu um erro inesperado.'
}

function formatDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AdminSuggestionsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: suggestions = [], isLoading, isError, refetch, updateStatusMutation } =
    useAdminSuggestions()

  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'all'>('all')
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [editing, setEditing]           = useState<SuggestionModel | null>(null)
  const [mutationError, setMutationError] = useState<string | null>(null)

  if (!user || !canAccessAdminDashboard(user)) return null

  const filtered = statusFilter === 'all'
    ? suggestions
    : suggestions.filter((s) => s.status === statusFilter)

  const counts = {
    pending:   suggestions.filter((s) => s.status === 'pending').length,
    in_review: suggestions.filter((s) => s.status === 'in_review').length,
    done:      suggestions.filter((s) => s.status === 'done').length,
    rejected:  suggestions.filter((s) => s.status === 'rejected').length,
  }

  function openEdit(s: SuggestionModel) {
    setEditing(s)
    setMutationError(null)
    setDialogOpen(true)
  }

  async function handleSave(status: SuggestionStatus, adminNote: string | null) {
    if (!editing) return
    setMutationError(null)
    try {
      await updateStatusMutation.mutateAsync({ id: editing.id, status, adminNote })
    } catch (err) {
      const msg = formatError(err)
      setMutationError(msg)
      throw new Error(msg)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {suggestions.length} sugestão{suggestions.length !== 1 ? 'ões' : ''} recebida
            {suggestions.length !== 1 ? 's' : ''}.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
          Atualizar
        </Button>
      </div>

      {/* Error */}
      {(isError || mutationError) && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {mutationError ?? 'Erro ao carregar sugestões. Tente atualizar.'}
        </div>
      )}

      {/* KPIs */}
      {!isLoading && suggestions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Aguardando</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{counts.pending}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Em análise</p>
            <p className="text-2xl font-bold text-stone-700 mt-1">{counts.in_review}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Concluídas</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{counts.done}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Encerradas</p>
            <p className="text-2xl font-bold text-muted-foreground mt-1">{counts.rejected}</p>
          </div>
        </div>
      )}

      {/* Filter chips */}
      {!isLoading && suggestions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Usuário</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Aplicativo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Título</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Data</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-30" aria-hidden />
                    <p className="text-sm font-medium">
                      {statusFilter === 'all'
                        ? 'Nenhuma sugestão recebida.'
                        : `Nenhuma sugestão com status "${STATUS_LABEL[statusFilter as SuggestionStatus]}".`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
                    s.status === 'rejected' && 'opacity-60'
                  )}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{s.userName}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                    {s.appName ?? '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-sm text-foreground">{s.title}</p>
                    {s.adminNote && (
                      <p className="text-xs text-green-700 truncate mt-0.5">↳ {s.adminNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="outline" className={TYPE_BADGE[s.type]}>
                      {TYPE_LABEL[s.type]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_BADGE[s.status]}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground tabular-nums">
                    {formatDate(s.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(s)}
                      aria-label={`Atualizar status de "${s.title}"`}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SuggestionStatusDialog
        open={dialogOpen}
        suggestion={editing}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSubmitting={updateStatusMutation.isPending}
      />
    </div>
  )
}
