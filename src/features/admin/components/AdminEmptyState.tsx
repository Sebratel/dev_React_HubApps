import type { ReactNode } from 'react'
import { InboxIcon } from 'lucide-react'

interface AdminEmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
}

export function AdminEmptyState({
  title = 'Nenhum item',
  description,
  icon,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
      <span className="text-muted-foreground/40" aria-hidden>
        {icon ?? <InboxIcon className="h-8 w-8" />}
      </span>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
