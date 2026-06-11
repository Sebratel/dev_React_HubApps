import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UserModel } from '@/types/models'

interface UserActionsMenuProps {
  user: UserModel
  currentUserId: string
  onEdit: () => void
  onActivate: () => void
  onDeactivate: () => void
  onPromoteAdmin: () => void
  onRevokeAdmin: () => void
}

const itemClass =
  'flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

const destructiveItemClass =
  'flex w-full cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors text-destructive hover:bg-destructive/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-40'

export function UserActionsMenu({
  user,
  currentUserId,
  onEdit,
  onActivate,
  onDeactivate,
  onPromoteAdmin,
  onRevokeAdmin,
}: UserActionsMenuProps) {
  const isSelf = user.id === currentUserId

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ações de ${user.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[176px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
            Editar perfil
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />

          {user.isActive ? (
            <DropdownMenu.Item className={destructiveItemClass} onSelect={onDeactivate}>
              Desativar
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item className={itemClass} onSelect={onActivate}>
              Ativar
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="-mx-1 my-1 h-px bg-border" />

          {user.isAdmin ? (
            <DropdownMenu.Item
              className={destructiveItemClass}
              disabled={isSelf}
              onSelect={onRevokeAdmin}
              aria-label={isSelf ? 'Não é possível revogar o próprio admin' : undefined}
            >
              Revogar admin
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item className={itemClass} disabled={isSelf} onSelect={onPromoteAdmin}>
              Promover a admin
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
