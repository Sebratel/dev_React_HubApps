import { useEffect, useRef, useState } from 'react'
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
  delay?: number
}

function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (from === target) return

    const start = performance.now()
    let raf: number
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return val
}

const accentLeft: Record<string, string> = {
  default: '',
  success: 'border-l-[3px] border-l-green-500',
  warning: 'border-l-[3px] border-l-amber-500',
  danger:  'border-l-[3px] border-l-red-500',
}

const iconPill: Record<string, string> = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-amber-100 text-amber-600',
  danger:  'bg-red-100 text-red-600',
}

const valueColor: Record<string, string> = {
  default: 'text-foreground',
  success: 'text-green-700',
  warning: 'text-amber-700',
  danger:  'text-red-700',
}

function AnimatedNumber({ value, variant }: { value: number; variant: string }) {
  const animated = useCountUp(value)
  return (
    <p className={cn('text-2xl font-bold tabular-nums', valueColor[variant])}>
      {animated}
    </p>
  )
}

export function AdminMetricCard({
  title,
  value,
  description,
  icon,
  variant = 'default',
  isLoading = false,
  delay = 0,
}: AdminMetricCardProps) {
  const animStyle = {
    animationDelay: `${delay}ms`,
    animationFillMode: 'both' as const,
  }

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-border bg-card p-4 animate-fade-in"
        style={animStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-12 mb-1.5" />
        <Skeleton className="h-3 w-24" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4',
        'hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default',
        'animate-fade-in',
        accentLeft[variant],
      )}
      style={animStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {icon && (
          <span className={cn('rounded-lg p-1.5', iconPill[variant])}>
            {icon}
          </span>
        )}
      </div>

      {typeof value === 'number' ? (
        <AnimatedNumber value={value} variant={variant} />
      ) : (
        <p className={cn('text-2xl font-bold', valueColor[variant])}>{value}</p>
      )}

      {description && (
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
      )}
    </div>
  )
}
