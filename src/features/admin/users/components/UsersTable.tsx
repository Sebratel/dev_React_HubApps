import { ShieldCheck, Users2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UserStatusBadge } from './UserStatusBadge'
import { UserProfileBadge } from './UserProfileBadge'
import { UserPermissionsPreview } from './UserPermissionsPreview'
import { UserActionsMenu } from './UserActionsMenu'
import type { UserModel } from '@/types/models'

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#FAEEDA', text: '#854F0B' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#EEEDFE', text: '#534AB7' },
  { bg: '#EAF3DE', text: '#3B6D11' },
  { bg: '#FCEBEB', text: '#A32D2D' },
]

function getAvatarColors(name: string) {
  return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function UsersTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="bg-muted/40 px-4 py-2.5 border-b border-border hidden sm:grid grid-cols-[1fr_auto_auto_auto_40px] gap-4">
        {['Usuário', 'Status', 'Perfil', 'Permissões', ''].map((h) => (
          <Skeleton key={h} className="h-3 w-20" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0"
        >
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full hidden sm:block" />
          <Skeleton className="h-5 w-20 rounded-full hidden sm:block" />
          <Skeleton className="h-5 w-24 rounded-full hidden sm:block" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────

export function UsersTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-16 flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Users2 className="h-6 w-6 text-muted-foreground/40" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">
          {hasFilters ? 'Nenhum usuário encontrado para este filtro.' : 'Nenhum usuário cadastrado.'}
        </p>
        {hasFilters && (
          <p className="mt-1 text-xs text-muted-foreground">Tente ajustar os filtros de busca.</p>
        )}
      </div>
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

interface UsersTableProps {
  users: UserModel[]
  currentUserId: string
  onEdit: (user: UserModel) => void
  onActivate: (user: UserModel) => void
  onDeactivate: (user: UserModel) => void
  onPromoteAdmin: (user: UserModel) => void
  onRevokeAdmin: (user: UserModel) => void
}

export function UsersTable({
  users,
  currentUserId,
  onEdit,
  onActivate,
  onDeactivate,
  onPromoteAdmin,
  onRevokeAdmin,
}: UsersTableProps) {
  return (
    <div
      className="rounded-xl border border-border overflow-hidden bg-card"
      role="table"
      aria-label="Usuários"
    >
      {/* Header */}
      <div
        role="row"
        className="hidden sm:grid grid-cols-[1fr_100px_120px_180px_48px] gap-4 px-4 py-2.5 bg-muted/40 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        <span>Usuário</span>
        <span>Status</span>
        <span>Perfil</span>
        <span>Permissões</span>
        <span />
      </div>

      {/* Rows */}
      {users.map((user) => {
        const colors = getAvatarColors(user.name)
        const initials = getInitials(user.name)

        return (
          <div
            key={user.id}
            role="row"
            className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0
                       hover:bg-muted/25 transition-colors
                       sm:grid sm:grid-cols-[1fr_100px_120px_180px_48px] sm:gap-4"
          >
            {/* Avatar + name + email */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:flex-none">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ background: colors.bg, color: colors.text }}
                aria-hidden
              >
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-foreground truncate">{user.name}</span>
                  {user.isAdmin && (
                    <ShieldCheck
                      className="h-3.5 w-3.5 text-purple-500 shrink-0"
                      aria-label="Administrador"
                    />
                  )}
                  <span className="sm:hidden">
                    <UserStatusBadge isActive={user.isActive} />
                  </span>
                </div>
                <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
              </div>
            </div>

            {/* Status */}
            <div className="hidden sm:block">
              <UserStatusBadge isActive={user.isActive} />
            </div>

            {/* Profile */}
            <div className="hidden sm:block">
              <UserProfileBadge profile={user.profile} />
            </div>

            {/* Permissions */}
            <div className="hidden sm:block">
              <UserPermissionsPreview permissions={user.permissions} />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end shrink-0">
              <UserActionsMenu
                user={user}
                currentUserId={currentUserId}
                onEdit={() => onEdit(user)}
                onActivate={() => onActivate(user)}
                onDeactivate={() => onDeactivate(user)}
                onPromoteAdmin={() => onPromoteAdmin(user)}
                onRevokeAdmin={() => onRevokeAdmin(user)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
