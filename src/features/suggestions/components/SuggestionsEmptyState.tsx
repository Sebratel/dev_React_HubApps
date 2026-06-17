import { MessageSquare, SearchX, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuggestionsEmptyStateProps {
  filtered: boolean
  onClearFilters?: () => void
  onCreate?: () => void
}

export function SuggestionsEmptyState({ filtered, onClearFilters, onCreate }: SuggestionsEmptyStateProps) {
  const Icon = filtered ? SearchX : MessageSquare

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-20 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-foreground">
        {filtered ? 'Nenhuma sugestão encontrada' : 'Nenhuma sugestão enviada ainda'}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {filtered
          ? 'Ajuste a busca ou os filtros para ver outras sugestões.'
          : 'Compartilhe uma ideia, melhoria ou reporte um problema.'}
      </p>
      {filtered && onClearFilters ? (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-1">
          Limpar filtros
        </Button>
      ) : !filtered && onCreate ? (
        <Button size="sm" onClick={onCreate} className="mt-1 gap-1.5">
          <Plus className="h-4 w-4" aria-hidden />
          Enviar primeira sugestão
        </Button>
      ) : null}
    </div>
  )
}
