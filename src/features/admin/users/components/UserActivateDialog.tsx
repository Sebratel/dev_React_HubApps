import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { UserModel } from '@/types/models'

interface UserActivateDialogProps {
  user: UserModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function UserActivateDialog({
  user,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: UserActivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ativar usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja ativar{' '}
            <span className="font-medium text-foreground">{user?.name}</span>? O usuário recuperará
            acesso ao Hub Sebratel.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p
            role="alert"
            className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Ativando...' : 'Ativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
