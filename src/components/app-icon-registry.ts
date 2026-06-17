import {
  ReceiptText,
  ChartNoAxesCombined,
  Network,
  Landmark,
  KanbanSquare,
  UsersRound,
  Headset,
  AppWindow,
  type LucideIcon,
} from 'lucide-react'

// Explicit map — only these icons are bundled (tree-shaking safe).
export const appIconRegistry: Record<string, LucideIcon> = {
  ReceiptText,
  ChartNoAxesCombined,
  Network,
  Landmark,
  KanbanSquare,
  UsersRound,
  Headset,
  AppWindow,
}

export type AppIconSize = 'sm' | 'md' | 'xl' | 'lg'

// Color palette for icons — full class strings so Tailwind includes them at build time.
export const iconColorMap: Record<string, { icon: string; bg: string; label: string; dot: string }> = {
  default: { icon: 'text-muted-foreground', bg: 'bg-muted',        label: 'Padrão',   dot: 'bg-slate-400' },
  amber:   { icon: 'text-amber-700',        bg: 'bg-amber-100',    label: 'Âmbar',    dot: 'bg-amber-500' },
  blue:    { icon: 'text-blue-600',         bg: 'bg-blue-100',     label: 'Azul',     dot: 'bg-blue-500' },
  green:   { icon: 'text-green-700',        bg: 'bg-green-100',    label: 'Verde',    dot: 'bg-green-600' },
  red:     { icon: 'text-red-600',          bg: 'bg-red-100',      label: 'Vermelho', dot: 'bg-red-500' },
  purple:  { icon: 'text-purple-600',       bg: 'bg-purple-100',   label: 'Roxo',     dot: 'bg-purple-500' },
  orange:  { icon: 'text-orange-600',       bg: 'bg-orange-100',   label: 'Laranja',  dot: 'bg-orange-500' },
  teal:    { icon: 'text-teal-700',         bg: 'bg-teal-100',     label: 'Teal',     dot: 'bg-teal-600' },
  pink:    { icon: 'text-pink-600',         bg: 'bg-pink-100',     label: 'Rosa',     dot: 'bg-pink-500' },
}

export type IconColorKey = keyof typeof iconColorMap

/** Encode icon name + color key into a single string stored in the `icon` field. */
export function encodeIconValue(name: string, color: IconColorKey): string {
  return color === 'default' ? name : `${name}:${color}`
}

/** Parse an icon field value into its name and color components. */
export function parseIconValue(value: string): { iconName: string; colorKey: IconColorKey } {
  const colonIdx = value.lastIndexOf(':')
  if (colonIdx === -1) return { iconName: value, colorKey: 'default' }
  const maybeColor = value.slice(colonIdx + 1)
  if (maybeColor in iconColorMap) {
    return { iconName: value.slice(0, colonIdx), colorKey: maybeColor as IconColorKey }
  }
  return { iconName: value, colorKey: 'default' }
}

export function isIconUrl(v: string): boolean {
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/')
}

export function isRegistryIcon(v: string): boolean {
  const { iconName } = parseIconValue(v)
  return iconName in appIconRegistry
}
