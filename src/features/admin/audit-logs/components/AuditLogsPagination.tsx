import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuditLogsPaginationProps {
  page: number
  totalPages: number
  totalLogs: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function AuditLogsPagination({
  page,
  totalPages,
  totalLogs,
  pageSize,
  onPageChange,
  disabled,
}: AuditLogsPaginationProps) {
  if (totalLogs <= pageSize) return null

  const from = Math.min((page - 1) * pageSize + 1, totalLogs)
  const to = Math.min(page * pageSize, totalLogs)

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <p className="text-xs text-muted-foreground">
        Exibindo {from}–{to} de {totalLogs} eventos
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Página anterior"
          disabled={page <= 1 || disabled}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[72px] text-center">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Próxima página"
          disabled={page >= totalPages || disabled}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
