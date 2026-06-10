import { cn } from '@/lib/utils'

interface UserAvatarProps {
  name: string
  photoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export function UserAvatar({ name, photoUrl, size = 'md', className }: UserAvatarProps) {
  const sizeClass = SIZE_CLASSES[size]

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn('rounded-full object-cover', sizeClass, className)}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold bg-sebratel-primary text-black',
        sizeClass,
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </div>
  )
}
