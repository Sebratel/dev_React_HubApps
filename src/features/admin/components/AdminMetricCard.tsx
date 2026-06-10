import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface AdminMetricCardProps {
  title: string
  value: number | string
  description?: string
  icon?: ReactNode
  variant?: 'default' | 'warning' | 'success' | 'danger'
  isLoading?: boolean
}

const variantClasses: Record<NonNullable<AdminMetricCardProps['variant']>, string> = {
  default: '',
  success: 'border-green-200 bg-green-50/50',
  warning: 'border-yellow-200 bg-yellow-50/50',
  danger: 'border-red-200 bg-red-50/50',
}

export function AdminMetricCard({
  title,
  value,
  description,
  icon,
  variant = 'default',
  isLoading = false,
}: AdminMetricCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-3.5 w-24 mb-3" />
        <Skeleton className="h-8 w-14" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', variantClasses[variant])}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  )
}
