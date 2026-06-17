import { cn } from '@/lib/utils'

interface SebratelLogoProps {
  size?: number
  /** Path to the official logo served from /public (default: /logo-circular-sebratel.png). */
  src?: string
  className?: string
}

/**
 * Official Sebratel brand logo with a subtle, non-destructive animation.
 * The artwork itself is never redrawn or distorted — it only floats gently
 * with a soft amber glow, and scales slightly on hover.
 */
export function SebratelLogo({ size = 32, src = '/logo-circular-sebratel.png', className }: SebratelLogoProps) {
  return (
    <div
      className={cn('sebratel-logo shrink-0 select-none', className)}
      style={{ width: size, height: size }}
    >
      <span className="sebratel-logo__glow" aria-hidden />
      <img src={src} alt="Sebratel" className="sebratel-logo__img" draggable={false} />
    </div>
  )
}
