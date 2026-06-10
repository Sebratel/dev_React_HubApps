interface AdminEmptyStateProps {
  title?: string
  description?: string
}

export function AdminEmptyState({
  title = 'Nenhum item',
  description,
}: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
