import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { updateMe, updateMyBirthDate } from '@/services/user.service'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle,
  AlertCircle,
  KeyRound,
  Calendar,
  Clock,
  ShieldCheck,
  LayoutGrid,
  Mail,
  BadgeCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatRelative(d: Date | null | undefined): string {
  if (!d) return '—'
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2)   return 'agora mesmo'
  if (mins < 60)  return `há ${mins} minutos`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `há ${hrs} hora${hrs > 1 ? 's' : ''}`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  if (days < 7)   return `há ${days} dias`
  return formatDate(d)
}

// ─── Small info row ───────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        accent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const user    = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [name,    setName]    = useState(user?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Birth date state
  const [birthDate,        setBirthDate]        = useState(user?.birthDate ?? '')
  const [isSavingBirth,    setIsSavingBirth]    = useState(false)
  const [birthSuccess,     setBirthSuccess]     = useState(false)
  const [birthError,       setBirthError]       = useState<string | null>(null)
  const birthSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync birth date when user changes (e.g. after save)
  useEffect(() => {
    setBirthDate(user?.birthDate ?? '')
  }, [user?.birthDate])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError,   setPasswordError]   = useState<string | null>(null)
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reduced = useReducedMotion()

  if (!user) return null

  const isPasswordUser = auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false
  const isDirty = name.trim() !== (user.name ?? '').trim()
  const isValid = name.trim().length >= 2
  const appsCount = user.permissions?.length ?? 0
  const isBirthDirty = birthDate !== (user.birthDate ?? '')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isDirty || !isValid || isSaving) return
    setIsSaving(true); setError(null); setSuccess(false)
    try {
      const updatedUser = await updateMe(name.trim())
      const firebaseUser = auth.currentUser
      if (firebaseUser) await updateProfile(firebaseUser, { displayName: name.trim() })
      setUser(updatedUser)
      setSuccess(true)
      if (successTimer.current) clearTimeout(successTimer.current)
      successTimer.current = setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSaveBirthDate(e: React.FormEvent) {
    e.preventDefault()
    if (!isBirthDirty || isSavingBirth) return
    setIsSavingBirth(true); setBirthError(null); setBirthSuccess(false)
    try {
      const updatedUser = await updateMyBirthDate(birthDate || null)
      setUser(updatedUser)
      setBirthSuccess(true)
      if (birthSuccessTimer.current) clearTimeout(birthSuccessTimer.current)
      birthSuccessTimer.current = setTimeout(() => setBirthSuccess(false), 3000)
    } catch (err) {
      setBirthError(err instanceof Error ? err.message : 'Erro ao salvar. Tente novamente.')
    } finally {
      setIsSavingBirth(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword.length < 6) { setPasswordError('A nova senha deve ter ao menos 6 caracteres.'); return }
    if (newPassword !== confirmPassword) { setPasswordError('As senhas não coincidem.'); return }

    const firebaseUser = auth.currentUser
    if (!firebaseUser || !firebaseUser.email) return

    setIsChangingPassword(true); setPasswordError(null); setPasswordSuccess(false)
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, newPassword)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      setPasswordSuccess(true)
      if (passwordSuccessTimer.current) clearTimeout(passwordSuccessTimer.current)
      passwordSuccessTimer.current = setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setPasswordError('Senha atual incorreta.')
      } else if (code === 'auth/too-many-requests') {
        setPasswordError('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else {
        setPasswordError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border bg-card p-6"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Amber glow decoration */}
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
          style={{ background: 'hsl(var(--primary) / 0.10)', filter: 'blur(48px)' }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Avatar */}
          <div className="shrink-0 ring-2 ring-primary/20 rounded-full">
            <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="xl" />
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-foreground truncate">
                {user.name || '—'}
              </h1>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Admin
                </span>
              )}
              {user.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  Ativo
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>

            <div className="flex flex-wrap items-center gap-3 mt-3">
              {user.profile && (
                <span className="inline-block text-xs font-medium bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                  {user.profile}
                </span>
              )}
              {user.createdAt && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  Membro desde {formatDate(user.createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* Left: form */}
        <motion.div
          className="flex flex-col gap-6"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Informações pessoais */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Informações pessoais</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Atualize seu nome de exibição no sistema.</p>
            </div>
            <form onSubmit={handleSave} className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium text-foreground">
                  Nome de exibição
                </label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  maxLength={120}
                  disabled={isSaving}
                  aria-describedby={error ? 'profile-error' : undefined}
                />
                <p className="text-xs text-muted-foreground">
                  Esse nome aparece no menu lateral e em registros do sistema.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground">E-mail</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border border-border">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  <span className="text-sm text-muted-foreground select-all">{user.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O e-mail é gerenciado pelo provedor de autenticação e não pode ser alterado aqui.
                </p>
              </div>

              {error && (
                <div
                  id="profile-error"
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                  Perfil atualizado com sucesso.
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty || !isValid || isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </form>
          </div>

          {/* Data de aniversário */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">Aniversário</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sua data de aniversário aparece nas celebrações do dashboard.
              </p>
            </div>
            <form onSubmit={handleSaveBirthDate} className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-birth-date" className="text-sm font-medium text-foreground">
                  Data de nascimento
                </label>
                <input
                  id="profile-birth-date"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={isSavingBirth}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground">
                  O ano de nascimento não é exibido publicamente — só o dia e mês aparecem nas celebrações.
                </p>
              </div>

              {birthError && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {birthError}
                </div>
              )}

              {birthSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
                >
                  <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                  Data de aniversário salva com sucesso.
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={!isBirthDirty || isSavingBirth}>
                  {isSavingBirth ? 'Salvando...' : 'Salvar aniversário'}
                </Button>
              </div>
            </form>
          </div>

          {/* Alterar senha */}
          {isPasswordUser && (
            <div className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <h2 className="text-sm font-semibold text-foreground">Alterar senha</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Escolha uma senha segura com ao menos 6 caracteres.</p>
              </div>
              <form onSubmit={handlePasswordChange} className="flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="current-password" className="text-sm font-medium text-foreground">
                    Senha atual
                  </label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={isChangingPassword}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                      Nova senha
                    </label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isChangingPassword}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                      Confirmar nova senha
                    </label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isChangingPassword}
                    />
                  </div>
                </div>

                {passwordError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                    {passwordError}
                  </div>
                )}

                {passwordSuccess && (
                  <div
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary"
                  >
                    <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                    Senha alterada com sucesso.
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
                  >
                    {isChangingPassword ? 'Alterando...' : 'Alterar senha'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </motion.div>

        {/* Right: account details sidebar */}
        <motion.div
          className="flex flex-col gap-4"
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: reduced ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Detalhes da conta */}
          <div className="rounded-2xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-foreground">Detalhes da conta</h2>
            </div>
            <div className="px-5 py-2">
              {user.profile && (
                <InfoRow icon={BadgeCheck} label="Perfil" value={user.profile} accent />
              )}
              <InfoRow
                icon={Calendar}
                label="Membro desde"
                value={formatDate(user.createdAt)}
              />
              <InfoRow
                icon={Clock}
                label="Último acesso"
                value={formatRelative(user.lastLogin)}
              />
              {appsCount > 0 && (
                <InfoRow
                  icon={LayoutGrid}
                  label="Aplicativos"
                  value={`${appsCount} com acesso`}
                />
              )}
            </div>
          </div>

          {/* Acesso ao sistema */}
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Acesso ao sistema</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  user.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-muted text-muted-foreground'
                )}>
                  <span
                    className={cn('h-1.5 w-1.5 rounded-full', user.isActive ? 'bg-green-500' : 'bg-muted-foreground')}
                    aria-hidden
                  />
                  {user.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Função</span>
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  user.isAdmin
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {user.isAdmin ? (
                    <><ShieldCheck className="h-3 w-3" aria-hidden /> Administrador</>
                  ) : (
                    'Usuário'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Autenticação</span>
                <span className="text-xs font-medium text-foreground">
                  {isPasswordUser ? 'E-mail / Senha' : 'Google SSO'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
