import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PROFILE_LABELS: Record<string, string> = {
  employee: 'Funcionário',
  user: 'Usuário',
  third_party: 'Terceiro',
  admin: 'Admin',
}

const PROFILE_STYLES: Record<string, string> = {
  employee:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300',
  user: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  third_party:
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300',
  admin:
    'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300',
}

interface UserProfileBadgeProps {
  profile: string
  className?: string
}

export function UserProfileBadge({ profile, className }: UserProfileBadgeProps) {
  const label = PROFILE_LABELS[profile] ?? profile
  const style =
    PROFILE_STYLES[profile] ??
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400'
  return (
    <Badge variant="outline" className={cn('text-xs', style, className)}>
      {label}
    </Badge>
  )
}
