import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  fullScreen?: boolean
  className?: string
}

export function LoadingSpinner({ fullScreen, className }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'w-10 h-10 rounded-full border-4 border-sebratel-primary border-t-transparent animate-spin',
        className
      )}
      role="status"
      aria-label="Carregando"
    >
      <span className="sr-only">Carregando…</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}
