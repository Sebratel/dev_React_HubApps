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
  size?: 'default' | 'sm'
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

function AnimatedNumber({
  value,
  variant,
  size,
}: {
  value: number
  variant: string
  size: string
}) {
  const animated = useCountUp(value)
  return (
    <p
      className={cn(
        'font-bold tabular-nums',
        size === 'sm' ? 'text-xl' : 'text-3xl',
        valueColor[variant],
      )}
    >
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
  size = 'default',
  isLoading = false,
  delay = 0,
}: AdminMetricCardProps) {
  const animStyle = {
    animationDelay: `${delay}ms`,
    animationFillMode: 'both' as const,
  }

  const isPrimary = size === 'default'

  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-card shadow-sm animate-fade-in',
          isPrimary ? 'p-5' : 'p-3.5',
        )}
        style={animStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-3 w-20" />
          {isPrimary && <Skeleton className="h-7 w-7 rounded-lg" />}
        </div>
        <Skeleton className={cn('mb-1.5', isPrimary ? 'h-9 w-14' : 'h-7 w-10')} />
        {isPrimary && <Skeleton className="h-3 w-24" />}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        'hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 cursor-default',
        'animate-fade-in',
        isPrimary ? 'p-5' : 'p-3.5',
        accentLeft[variant],
      )}
      style={animStyle}
    >
      <div className={cn('flex items-center justify-between', isPrimary ? 'mb-3' : 'mb-2')}>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {icon && isPrimary && (
          <span className={cn('rounded-lg p-1.5', iconPill[variant])}>
            {icon}
          </span>
        )}
      </div>

      {typeof value === 'number' ? (
        <AnimatedNumber value={value} variant={variant} size={size} />
      ) : (
        <p
          className={cn(
            'font-bold',
            isPrimary ? 'text-3xl' : 'text-xl',
            valueColor[variant],
          )}
        >
          {value}
        </p>
      )}

      {description && isPrimary && (
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
      )}
    </div>
  )
}
