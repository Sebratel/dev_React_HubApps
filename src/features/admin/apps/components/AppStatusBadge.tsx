import type { AppStatus } from '@/types/enums'

const CONFIG: Record<AppStatus, { label: string; className: string }> = {
  active: { label: 'Ativo', className: 'border-green-300 bg-green-50 text-green-700' },
  maintenance: { label: 'Inativo', className: 'border-gray-300 bg-gray-50 text-gray-600' },
  novo: { label: 'Novo', className: 'border-blue-300 bg-blue-50 text-blue-700' },
}

export function AppStatusBadge({ status }: { status: AppStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.maintenance
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  )
}
