import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { signOut } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/UserAvatar'

export function PendingApprovalPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // Active users have no business here — redirect to dashboard
  if (user?.isActive) return <Navigate to="/" replace />

  async function handleSignOut() {
    try {
      await signOut()
    } catch (err) {
      console.error('[auth] signOut failed — local session cleared:', err)
    }
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6 bg-card rounded-2xl border border-border p-8 shadow-lg text-center">
        {user && <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="lg" />}

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-foreground">Aguardando ativação</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sua conta foi registrada com sucesso, mas ainda precisa ser ativada por um administrador
            antes que você possa acessar o Hub.
          </p>
        </div>

        {user && (
          <div className="w-full rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            {user.email}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Entre em contato com o administrador do sistema se a ativação estiver demorando.
        </p>

        <Button variant="outline" onClick={handleSignOut} className="w-full">
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
