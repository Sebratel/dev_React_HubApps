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

interface UserDeactivateDialogProps {
  user: UserModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

export function UserDeactivateDialog({
  user,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: UserDeactivateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desativar usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja desativar{' '}
            <span className="font-medium text-foreground">{user?.name}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive font-medium">
            Atenção: o usuário perderá todo o acesso ao Hub Sebratel imediatamente.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Desativando...' : 'Desativar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
