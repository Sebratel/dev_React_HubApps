import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SEBRATEL_PROFILES } from '@/constants/profiles'
import { getTeams } from '@/services/team.service'
import type { UserModel } from '@/types/models'

interface UserEditDialogProps {
  user: UserModel | null
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: (patch: Partial<Pick<UserModel, 'profile' | 'team'>>) => void
  onClose: () => void
}

export function UserEditDialog({
  user, open, isPending, error, onConfirm, onClose,
}: UserEditDialogProps) {
  const [profile, setProfile] = useState('')
  const [teamId, setTeamId]   = useState<string>('')

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn:  getTeams,
    staleTime: 300_000,
    enabled: open,
  })

  useEffect(() => {
    if (user) {
      // If the stored profile is no longer a valid option, fall back to the first
      // available option so the state matches what the <select> displays.
      const validValues = SEBRATEL_PROFILES.map((p) => p.value as string)
      const resolved = validValues.includes(user.profile) ? user.profile : SEBRATEL_PROFILES[0].value
      setProfile(resolved)
      setTeamId(user.team ?? '')
    }
  }, [user])

  function handleSubmit() {
    if (!user) return
    const patch: Partial<Pick<UserModel, 'profile' | 'team'>> = {}
    if (profile !== user.profile) patch.profile = profile
    const newTeam = teamId || null
    if (newTeam !== (user.team ?? null)) patch.team = newTeam
    if (Object.keys(patch).length === 0) { onClose(); return }
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
            <label htmlFor="edit-profile" className="text-sm font-medium">Perfil</label>
            <Select
              id="edit-profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              disabled={isPending}
            >
              {SEBRATEL_PROFILES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-team" className="text-sm font-medium">
              Time <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <Select
              id="edit-team"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              disabled={isPending}
            >
              <option value="">— Nenhum —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Times são gerenciados em{' '}
              <a href="/admin/teams" className="underline hover:text-foreground">
                Admin → Times
              </a>.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Permissões e status admin são gerenciadas separadamente.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
