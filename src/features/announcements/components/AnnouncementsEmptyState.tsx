import { Bell, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnnouncementsEmptyStateProps {
  /** When true, the dataset has items but the current filters matched nothing. */
  filtered: boolean
  onClearFilters?: () => void
}

/** Discreet empty state — handles both "no announcements" and "no results". */
export function AnnouncementsEmptyState({ filtered, onClearFilters }: AnnouncementsEmptyStateProps) {
  const Icon = filtered ? SearchX : Bell

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
        {filtered ? 'Nenhum aviso encontrado' : 'Nenhum aviso disponível'}
      </p>
      <p className="max-w-xs text-xs text-muted-foreground">
        {filtered
          ? 'Ajuste a busca ou os filtros para ver outros comunicados.'
          : 'Novos comunicados da empresa aparecerão aqui.'}
      </p>
      {filtered && onClearFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-1">
          Limpar filtros
        </Button>
      )}
    </div>
  )
}
