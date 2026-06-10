import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { signInWithGoogle, signInWithEmailAndPassword } from '@/services/auth.service'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setError(null)
    setIsLoading(true)
    try {
      const result = await signInWithGoogle()
      if (!result.success) {
        setError(result.error ?? 'Erro ao entrar com Google.')
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const result = await signInWithEmailAndPassword(email, password)
      if (!result.success) {
        setError(result.error ?? 'E-mail ou senha incorretos.')
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-mail ou senha incorretos.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-card rounded-2xl shadow-lg border border-border flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Sebratel Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">Acesso corporativo</p>
      </div>

      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Entrar com Google
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">ou</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <form onSubmit={handleEmailSignIn} className="flex flex-col gap-3">
        <Input
          type="email"
          placeholder="E-mail corporativo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={isLoading}
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
        <Button type="submit" className="w-full" disabled={isLoading || !email || !password}>
          {isLoading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive text-center rounded-md bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
