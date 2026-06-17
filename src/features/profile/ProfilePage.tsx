import { useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth'
import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth.store'
import { updateMe } from '@/services/user.service'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, AlertCircle, KeyRound } from 'lucide-react'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [name, setName] = useState(user?.name ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reduced = useReducedMotion()

  if (!user) return null

  const isPasswordUser = auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false

  const isDirty = name.trim() !== (user.name ?? '').trim()
  const isValid = name.trim().length >= 2

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isDirty || !isValid || isSaving) return

    setIsSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const updatedUser = await updateMe(name.trim())

      // Keep Firebase displayName in sync
      const firebaseUser = auth.currentUser
      if (firebaseUser) {
        await updateProfile(firebaseUser, { displayName: name.trim() })
      }

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

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) return
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter ao menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    const firebaseUser = auth.currentUser
    if (!firebaseUser || !firebaseUser.email) return

    setIsChangingPassword(true)
    setPasswordError(null)
    setPasswordSuccess(false)

    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword)
      await reauthenticateWithCredential(firebaseUser, credential)
      await updatePassword(firebaseUser, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
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
    <div className="max-w-lg">
      <motion.div
        className="mb-6"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-2xl font-bold text-foreground">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais.</p>
      </motion.div>

      {/* Avatar + identidade */}
      <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-card border border-border">
        <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="lg" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{user.name || '—'}</p>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          {user.profile && (
            <span className="mt-1 inline-block text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
              {user.profile}
            </span>
          )}
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSave} className="flex flex-col gap-5">
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

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <p className="text-sm text-muted-foreground px-3 py-2 rounded-md bg-muted border border-border select-all">
            {user.email}
          </p>
          <p className="text-xs text-muted-foreground">
            O e-mail é gerenciado pelo provedor de autenticação e não pode ser alterado aqui.
          </p>
        </div>

        {/* Feedback */}
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

      {/* Troca de senha — apenas para contas e-mail/senha */}
      {isPasswordUser && (
        <>
          <div className="my-8 h-px bg-border" />

          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="text-base font-semibold text-foreground">Alterar senha</h2>
          </div>

          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
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
              <p className="text-xs text-muted-foreground">Mínimo de 6 caracteres.</p>
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
        </>
      )}
    </div>
  )
}
