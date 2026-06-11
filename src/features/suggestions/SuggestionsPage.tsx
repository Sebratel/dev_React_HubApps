import { useState } from 'react'
import { Plus, MessageSquare, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSuggestions } from './hooks/useSuggestions'
import { SuggestionCard } from './components/SuggestionCard'
import { SuggestionFormDialog } from './components/SuggestionFormDialog'
import type { CreateSuggestionPayload } from '@/services/suggestion.service'

export function SuggestionsPage() {
  const { data: suggestions = [], isLoading, isError, refetch, createMutation } = useSuggestions()
  const [dialogOpen, setDialogOpen] = useState(false)

  async function handleSave(payload: CreateSuggestionPayload) {
    await createMutation.mutateAsync(payload)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sugestões</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie ideias, melhorias ou reporte problemas nos aplicativos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} aria-hidden />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Nova sugestão
          </Button>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar sugestões. Tente atualizar.
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
              <div className="flex gap-2">
                <div className="h-5 w-24 bg-muted rounded-full animate-pulse" />
                <div className="h-5 w-16 bg-muted rounded-full animate-pulse ml-auto" />
              </div>
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && suggestions.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 opacity-25" aria-hidden />
          <div className="text-center">
            <p className="text-sm font-medium">Nenhuma sugestão enviada ainda.</p>
            <p className="text-xs mt-1">Compartilhe uma ideia ou reporte um problema.</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" aria-hidden />
            Enviar primeira sugestão
          </Button>
        </div>
      )}

      {/* List */}
      {!isLoading && suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))}
        </div>
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
