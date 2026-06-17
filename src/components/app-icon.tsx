import { useState } from 'react'
import { Package } from 'lucide-react'
import {
  appIconRegistry,
  iconColorMap,
  isIconUrl,
  parseIconValue,
  type AppIconSize,
} from './app-icon-registry'
import { cn } from '@/lib/utils'

interface AppIconProps {
  icon: string
  /** Passed for future aria-label support; component renders aria-hidden in all current contexts. */
  name: string
  size?: AppIconSize
  showBackground?: boolean
  className?: string
}

const sizeConfig: Record<AppIconSize, { wrapper: string; lucide: number; emoji: string; img: string }> = {
  sm: { wrapper: 'h-10 w-10', lucide: 18, emoji: 'text-xl',  img: 'h-6 w-6' },
  md: { wrapper: 'h-12 w-12', lucide: 22, emoji: 'text-2xl', img: 'h-7 w-7' },
  xl: { wrapper: 'h-14 w-14', lucide: 26, emoji: 'text-3xl', img: 'h-9 w-9' },
  lg: { wrapper: 'h-16 w-16', lucide: 30, emoji: 'text-4xl', img: 'h-10 w-10' },
}

export function AppIcon({ icon, size = 'md', showBackground = true, className }: AppIconProps) {
  const [imgError, setImgError] = useState(false)
  const cfg = sizeConfig[size]

  const { iconName, colorKey } = parseIconValue(icon)
  const colors = iconColorMap[colorKey] ?? iconColorMap.default

  let content: React.ReactNode

  if (isIconUrl(icon) && !imgError) {
    content = (
      <img
        src={icon}
        alt=""
        aria-hidden
        className={cn('object-contain', cfg.img)}
        onError={() => setImgError(true)}
      />
    )
  } else if (iconName in appIconRegistry) {
    const LucideComp = appIconRegistry[iconName]
    content = <LucideComp size={cfg.lucide} aria-hidden className={colors.icon} />
  } else if (isIconUrl(icon) && imgError) {
    content = <Package size={cfg.lucide} aria-hidden className="text-muted-foreground/40" />
  } else {
    const display = icon && icon.trim().length > 0 ? icon : '📦'
    content = (
      <span className={cn(cfg.emoji, 'select-none leading-none')} aria-hidden>
        {display}
      </span>
    )
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center',
        showBackground && cn('rounded-xl', colors.bg),
        cfg.wrapper,
        className,
      )}
      aria-hidden
    >
      {content}
    </div>
  )
}
