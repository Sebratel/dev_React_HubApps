import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface AdminErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function AdminErrorState({
  message = 'Ocorreu um erro ao carregar os dados.',
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  )
}
