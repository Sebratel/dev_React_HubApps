import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SEBRATEL_PROFILES } from '@/constants/profiles'
import { getTeams } from '@/services/team.service'
import type { CreateExternalUserPayload } from '@/services/admin/admin-user.service'

interface CreateExternalUserDialogProps {
  open: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: (payload: CreateExternalUserPayload) => Promise<void>
}

const DEFAULT = { name: '', email: '', password: '', confirmPassword: '', profile: '', teamId: '' }

export function CreateExternalUserDialog({
  open, isPending, onClose, onConfirm,
}: CreateExternalUserDialogProps) {
  const [form, setForm]         = useState(DEFAULT)
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn:  getTeams,
    staleTime: 300_000,
    enabled:  open,
  })

  useEffect(() => {
    if (open) { setForm(DEFAULT); setError(null); setSuccess(null); setShowPwd(false) }
  }, [open])

  function set(key: keyof typeof DEFAULT, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim())           { setError('Nome é obrigatório.'); return }
    if (!form.email.trim())          { setError('E-mail é obrigatório.'); return }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError('E-mail inválido.'); return }
    if (form.password.length < 6)    { setError('Senha deve ter ao menos 6 caracteres.'); return }
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return }

    try {
      await onConfirm({
        name:    form.name.trim(),
        email:   form.email.trim().toLowerCase(),
        password: form.password,
        profile: form.profile || undefined,
        teamId:  form.teamId || null,
      })
      setSuccess(form.name.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.')
    }
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" aria-hidden />
            <div>
              <p className="text-base font-semibold text-foreground">Usuário criado!</p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-medium text-foreground">{success}</span> pode agora
                entrar com e-mail e senha. Compartilhe as credenciais com segurança.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setSuccess(null); setForm(DEFAULT) }}
            >
              Criar outro
            </Button>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário externo</DialogTitle>
          <DialogDescription>
            Cria uma conta com e-mail e senha para colaboradores sem conta Google.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ext-name" className="text-sm font-medium">
              Nome completo <span className="text-destructive">*</span>
            </label>
            <Input
              id="ext-name"
              placeholder="Ex: João Silva"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={isPending}
              maxLength={255}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ext-email" className="text-sm font-medium">
              E-mail <span className="text-destructive">*</span>
            </label>
            <Input
              id="ext-email"
              type="email"
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              disabled={isPending}
              autoComplete="off"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext-password" className="text-sm font-medium">
                Senha <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  id="ext-password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Mín. 6 caracteres"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  disabled={isPending}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPwd
                    ? <EyeOff className="h-4 w-4" aria-hidden />
                    : <Eye    className="h-4 w-4" aria-hidden />
                  }
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext-confirm" className="text-sm font-medium">
                Confirmar <span className="text-destructive">*</span>
              </label>
              <Input
                id="ext-confirm"
                type={showPwd ? 'text' : 'password'}
                placeholder="Repetir senha"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext-profile" className="text-sm font-medium">Perfil</label>
              <Select
                id="ext-profile"
                value={form.profile}
                onChange={(e) => set('profile', e.target.value)}
                disabled={isPending}
              >
                <option value="">— Sem perfil —</option>
                {SEBRATEL_PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ext-team" className="text-sm font-medium">Time</label>
              <Select
                id="ext-team"
                value={form.teamId}
                onChange={(e) => set('teamId', e.target.value)}
                disabled={isPending}
              >
                <option value="">— Nenhum —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={isPending}>
            {isPending ? 'Criando...' : 'Criar usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
