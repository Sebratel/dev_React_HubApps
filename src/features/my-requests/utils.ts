import { Clock3, CheckCircle2, XCircle, type LucideIcon } from 'lucide-react'
import type { AccessRequestStatus } from '@/types/enums'

export interface RequestStatusMeta {
  label: string
  icon: LucideIcon
  /** Left accent bar — token color only. */
  accent: string
  /** Icon chip background + text — token-based soft tint. */
  iconChip: string
  /** Status badge — token-based soft tint. */
  badge: string
}

/** Token-based only (primary = âmbar, success, destructive). No hardcoded hex. */
export const REQUEST_STATUS_META: Record<AccessRequestStatus, RequestStatusMeta> = {
  pending: {
    label: 'Aguardando',
    icon: Clock3,
    accent: 'bg-primary',
    iconChip: 'bg-primary/12 text-primary',
    badge: 'bg-primary/10 text-primary',
  },
  approved: {
    label: 'Aprovado',
    icon: CheckCircle2,
    accent: 'bg-success',
    iconChip: 'bg-success/10 text-success',
    badge: 'bg-success/10 text-success',
  },
  rejected: {
    label: 'Rejeitado',
    icon: XCircle,
    accent: 'bg-destructive',
    iconChip: 'bg-destructive/10 text-destructive',
    badge: 'bg-destructive/10 text-destructive',
  },
}

export function getRequestStatusMeta(status: AccessRequestStatus): RequestStatusMeta {
  return REQUEST_STATUS_META[status] ?? REQUEST_STATUS_META.pending
}
