import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PROFILE_LABEL, PROFILE_STYLE } from '@/constants/profiles'

interface UserProfileBadgeProps {
  profile: string
  className?: string
}

export function UserProfileBadge({ profile, className }: UserProfileBadgeProps) {
  const label = PROFILE_LABEL[profile] ?? profile
  const style =
    PROFILE_STYLE[profile] ??
    'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400'
  return (
    <Badge variant="outline" className={cn('text-xs', style, className)}>
      {label}
    </Badge>
  )
}
