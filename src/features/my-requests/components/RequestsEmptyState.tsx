import { ClipboardList, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RequestsEmptyStateProps {
  filtered: boolean
  onClearFilters?: () => void
}

export function RequestsEmptyState({ filtered, onClearFilters }: RequestsEmptyStateProps) {
  const Icon = filtered ? SearchX : ClipboardList

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
        {filtered ? 'Nenhuma solicitação encontrada' : 'Nenhuma solicitação ainda'}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {filtered
          ? 'Ajuste a busca ou os filtros para ver outras solicitações.'
          : 'Seus pedidos de acesso a aplicativos aparecerão aqui.'}
      </p>
      {filtered && onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-1">
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
