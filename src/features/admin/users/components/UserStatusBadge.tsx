import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface UserStatusBadgeProps {
  isActive: boolean
  className?: string
}

export function UserStatusBadge({ isActive, className }: UserStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs',
        isActive
          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300'
          : 'border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400',
        className
      )}
    >
      {isActive ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}
