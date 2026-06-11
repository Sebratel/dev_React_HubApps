import type { AccessRequestStatus } from '@/types/enums'

const CONFIG: Record<AccessRequestStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendente',
    className:
      'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  },
  approved: {
    label: 'Aprovada',
    className:
      'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300',
  },
  rejected: {
    label: 'Rejeitada',
    className:
      'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300',
  },
}

export function AccessRequestStatusBadge({ status }: { status: AccessRequestStatus }) {
  const { label, className } = CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  )
}
