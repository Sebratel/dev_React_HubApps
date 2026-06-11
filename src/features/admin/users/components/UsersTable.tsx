import { ShieldCheck, Users2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { UserStatusBadge } from './UserStatusBadge'
import { UserProfileBadge } from './UserProfileBadge'
import { UserPermissionsPreview } from './UserPermissionsPreview'
import { UserActionsMenu } from './UserActionsMenu'
import type { UserModel } from '@/types/models'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function UsersTableSkeleton() {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_40px] gap-4 border-b border-border">
        {['Usuário', 'Status', 'Perfil', 'Permissões', ''].map((h) => (
          <Skeleton key={h} className="h-3.5 w-20" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 grid grid-cols-[1fr_auto_auto_auto_40px] gap-4 items-center border-b border-border last:border-0"
        >
          <div>
            <Skeleton className="h-4 w-36 mb-1" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  )
}

// ─── Empty ────────────────────────────────────────────────────────────────────

export function UsersTableEmpty({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-xl border border-border py-12 flex flex-col items-center gap-3 text-center">
      <Users2 className="h-8 w-8 text-muted-foreground/40" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">
        {hasFilters ? 'Nenhum usuário encontrado para este filtro.' : 'Nenhum usuário cadastrado.'}
      </p>
      {hasFilters && (
        <p className="text-xs text-muted-foreground">Tente ajustar os filtros de busca.</p>
      )}
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
      className="rounded-xl border border-border overflow-hidden"
      role="table"
      aria-label="Usuários"
    >
      {/* Header */}
      <div
        role="row"
        className="hidden sm:grid grid-cols-[1fr_100px_120px_180px_48px] gap-4 px-4 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide"
      >
        <span>Usuário</span>
        <span>Status</span>
        <span>Perfil</span>
        <span>Permissões</span>
        <span />
      </div>

      {/* Rows */}
      {users.map((user) => (
        <div
          key={user.id}
          role="row"
          className="grid grid-cols-[1fr_auto_40px] sm:grid-cols-[1fr_100px_120px_180px_48px] gap-4 px-4 py-3 items-center border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
        >
          {/* Name + email */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium truncate">{user.name}</span>
              {user.isAdmin && (
                <ShieldCheck
                  className="h-3.5 w-3.5 text-purple-500 shrink-0"
                  aria-label="Administrador"
                />
              )}
              {/* Status badge visible only on mobile */}
              <span className="sm:hidden">
                <UserStatusBadge isActive={user.isActive} />
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
          </div>

          {/* Status — hidden on mobile, shown via badge in name area on mobile */}
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
          <div className="flex items-center justify-end">
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
      ))}
    </div>
  )
}
