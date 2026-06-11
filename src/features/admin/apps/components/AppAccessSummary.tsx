import type { AppItemModel } from '@/types/models'

const PROFILE_LABELS: Record<string, string> = {
  employee: 'Funcionários',
  user: 'Usuários',
  third_party: 'Terceiros',
}

export function AppAccessSummary({ app }: { app: AppItemModel }) {
  const hasProfiles = app.allowedProfiles.length > 0
  const hasUsers = app.allowedUsers.length > 0
  const hasTeams = app.allowedTeams.length > 0
  const hasAny = hasProfiles || hasUsers || hasTeams

  if (!hasAny) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
        Nenhuma regra
      </span>
    )
  }

  return (
    <div className="flex flex-wrap gap-1">
      {app.allowedProfiles.map((p) => (
        <span
          key={p}
          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
        >
          {PROFILE_LABELS[p] ?? p}
        </span>
      ))}
      {hasUsers && (
        <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
          {app.allowedUsers.length} usuário{app.allowedUsers.length !== 1 ? 's' : ''}
        </span>
      )}
      {hasTeams && (
        <span className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
          {app.allowedTeams.length} time{app.allowedTeams.length !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
