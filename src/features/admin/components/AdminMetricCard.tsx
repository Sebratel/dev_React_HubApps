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
  success: 'border-green-200  bg-green-50/60',
  warning: 'border-amber-200  bg-amber-50/60',
  danger:  'border-red-200    bg-red-50/60',
}

const valueClasses: Record<NonNullable<AdminMetricCardProps['variant']>, string> = {
  default: 'text-foreground',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger:  'text-red-700',
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
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-14 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', variantClasses[variant])}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn('text-2xl font-bold', valueClasses[variant])}>{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}
