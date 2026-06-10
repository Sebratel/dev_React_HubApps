import { MoreVertical, Pencil, Power, PowerOff } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { AppItemModel } from '@/types/models'

interface AppActionsMenuProps {
  app: AppItemModel
  onEdit: () => void
  onDeactivate: () => void
  onReactivate: () => void
}

export function AppActionsMenu({ app, onEdit, onDeactivate, onReactivate }: AppActionsMenuProps) {
  const isActive = app.status === 'active'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={`Ações de ${app.name}`}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[10rem] rounded-xl border border-border bg-card shadow-lg p-1 text-sm"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer hover:bg-accent focus:bg-accent focus:outline-none"
            onSelect={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </DropdownMenu.Item>

          {isActive ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:outline-none"
              onSelect={onDeactivate}
            >
              <PowerOff className="h-3.5 w-3.5" />
              Desativar
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className="flex items-center gap-2 rounded-md px-3 py-1.5 cursor-pointer text-green-700 hover:bg-green-50 focus:bg-green-50 focus:outline-none"
              onSelect={onReactivate}
            >
              <Power className="h-3.5 w-3.5" />
              Reativar
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
