import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { UserModel } from '@/types/models'

import { SEBRATEL_PROFILES } from '@/constants/profiles'

const PROFILES = SEBRATEL_PROFILES

interface UserEditDialogProps {
  user: UserModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: (patch: Partial<Pick<UserModel, 'profile' | 'team'>>) => void
  onClose: () => void
}

export function UserEditDialog({
  user,
  open,
  isPending,
  error,
  onConfirm,
  onClose,
}: UserEditDialogProps) {
  const [profile, setProfile] = useState('')
  const [team, setTeam] = useState('')

  // Sync form when target user changes
  useEffect(() => {
    if (user) {
      setProfile(user.profile)
      setTeam(user.team ?? '')
    }
  }, [user])

  function handleSubmit() {
    if (!user) return
    const patch: Partial<Pick<UserModel, 'profile' | 'team'>> = {}
    if (profile !== user.profile) patch.profile = profile
    // Send null when team is cleared, original value when unchanged
    const newTeam = team.trim() || null
    if (newTeam !== (user.team ?? null)) patch.team = newTeam
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    onConfirm(patch)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Editando <span className="font-medium text-foreground">{user?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-profile" className="text-sm font-medium">
              Perfil
            </label>
            <Select
              id="edit-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              disabled={isPending}
            >
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-team" className="text-sm font-medium">
              Time <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Input
              id="edit-team"
              placeholder="ID do time ou deixe vazio"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              disabled={isPending}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Permissões e status admin são gerenciadas separadamente.
          </p>
        </div>

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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
