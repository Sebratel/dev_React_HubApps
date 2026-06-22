import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth.store'
import {
  signInWithGoogle,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@/services/auth.service'
import { AlertCircle, Lock, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Google SVG ───────────────────────────────────────────────────────────────

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

// ─── Hexagonal floating icon ──────────────────────────────────────────────────

function HexIcon({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="relative pointer-events-none select-none" style={style} aria-hidden>
      <svg width="64" height="72" viewBox="0 0 64 72">
        <polygon
          points="32,2 62,18 62,54 32,70 2,54 2,18"
          fill="none"
          stroke="rgba(255,176,0,0.55)"
          strokeWidth="1.5"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[#FFB000]/70">
        {children}
      </div>
    </div>
  )
}

// ─── Simple inline icons for the hex tiles ───────────────────────────────────

const IconBolt = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)
const IconCloud = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
  </svg>
)
const IconBattery = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="6" width="18" height="12" rx="2" />
    <line x1="23" y1="13" x2="23" y2="11" />
  </svg>
)
const IconUsers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconWifi = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
)
const IconBarChart = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

// ─── Component ───────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate     = useNavigate()
  const location     = useLocation()
  const authError    = useAuthStore((s) => s.error)
  const setAuthError = useAuthStore((s) => s.setError)
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/'

  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState(false)
  const [resetState, setResetState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [resetError, setResetError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setAuthError(null); setError(null); setIsLoading(true)
    try {
      const result = await signInWithGoogle()
      if (!result.success) { if (result.error) setError(result.error); return }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar com Google.')
    } finally { setIsLoading(false) }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null); setError(null); setIsLoading(true)
    try {
      const result = await signInWithEmailAndPassword(email, password)
      if (!result.success) { setError(result.error ?? 'E-mail ou senha incorretos.'); return }
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-mail ou senha incorretos.')
    } finally { setIsLoading(false) }
  }

  async function handlePasswordReset() {
    setResetError(null)
    if (!email.trim()) { setResetError('Preencha o e-mail acima primeiro.'); return }
    setResetState('sending')
    try {
      await sendPasswordResetEmail(email.trim())
      setResetState('sent')
    } catch {
      setResetState('idle')
      setResetError('Não foi possível enviar o e-mail. Verifique e tente novamente.')
    }
  }

  const displayError = error ?? authError

  return (
    <div className="h-screen w-screen flex overflow-hidden">

      {/* ── Esquerda: imagem escura + ícones hexagonais ─────────────────── */}
      <div className="hidden lg:flex relative flex-col justify-end flex-1 overflow-hidden bg-[#0d0a06]">
        {/* Imagem de fundo */}
        <img
          src="/login-cover.png"
          alt=""
          aria-hidden
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-90 animate-ken-burns"
        />
        {/* Overlay âmbar sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d1800]/60 via-transparent to-[#0d0a06]/40" />
        {/* Faixa escura inferior para legibilidade do texto */}
        <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Texto inferior + ícones */}
        <div className="relative z-10 px-12 py-10 flex items-end justify-between gap-6">
          {/* Texto */}
          <div className="min-w-0">
            {/* Badge */}
            <div className="flex items-center gap-2 mb-5">
              <img src="/logo-circular-sebratel.png" alt="Sebratel" className="w-10 h-10 opacity-90" draggable={false} />
              <span className="text-xs font-bold tracking-[0.18em] text-white/70 uppercase">Sebratel Hub</span>
            </div>

            <h1 className="text-[2.4rem] font-black text-white leading-[1.15] tracking-tight">
              A conexão que<br />
              move{' '}
              <span className="text-[#FFB000]">o que importa.</span>
            </h1>
            <p className="mt-3 text-sm text-white/50 font-medium leading-relaxed max-w-sm">
              Tecnologia e pessoas conectadas para levar o melhor todos os dias.
            </p>
          </div>

          {/* Ícones hexagonais em grid 2×3 */}
          <div className="shrink-0 flex flex-col gap-1.5 pb-1">
            <div className="flex gap-1.5">
              <HexIcon><IconBolt /></HexIcon>
              <HexIcon><IconCloud /></HexIcon>
              <HexIcon><IconUsers /></HexIcon>
            </div>
            <div className="flex gap-1.5">
              <HexIcon><IconBattery /></HexIcon>
              <HexIcon><IconWifi /></HexIcon>
              <HexIcon><IconBarChart /></HexIcon>
            </div>
          </div>
        </div>
      </div>

      {/* ── Faixa divisória âmbar ───────────────────────────────────────── */}
      <div className="hidden lg:block w-1.5 shrink-0 bg-[#FFB000] z-10" aria-hidden />

      {/* ── Direita: formulário ─────────────────────────────────────────── */}
      <div className="w-full lg:w-[35%] shrink-0 flex flex-col bg-[#efefed] overflow-y-auto">
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
          <div className="w-full max-w-[320px] flex flex-col items-center gap-6">

            {/* Badge topo */}
            <span
              className="inline-flex items-center rounded-full px-5 py-1.5 text-[11px] font-bold tracking-[0.18em] text-primary uppercase"
              style={{ background: '#efefed', boxShadow: 'inset 3px 3px 7px rgba(0,0,0,0.12), inset -2px -2px 6px rgba(255,255,255,0.85)' }}
            >
              Sebratel Hub
            </span>

            {/* Título */}
            <div className="text-center">
              <h2 className="text-[1.75rem] font-black text-[#1a0f00] tracking-tight leading-tight">
                Acessar plataforma
              </h2>
              <p className="mt-2 text-sm text-[#7a6a55] leading-snug">
                Acesso com conta Google para controle de<br />permissões por módulo.
              </p>
            </div>

            {/* Info de domínio */}
            <div
              className="w-full flex items-center gap-4 rounded-2xl bg-[#efefed] px-5 py-4"
              style={{ boxShadow: '6px 6px 14px rgba(0,0,0,0.11), -4px -4px 10px rgba(255,255,255,0.9)' }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: '#efefed', boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.12), inset -2px -2px 5px rgba(255,255,255,0.82)' }}
              >
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-[0.14em] text-primary uppercase">
                  Domínio liberado:
                </p>
                <p className="text-sm font-bold text-[#1a0f00]">@sebratel.com.br</p>
              </div>
            </div>

            {/* Botão Google */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-primary text-[#1a0f00] font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-60"
              style={{ boxShadow: '0 4px 18px rgba(255,176,0,0.45), 0 1px 4px rgba(0,0,0,0.12)' }}
            >
              {GOOGLE_SVG}
              Entrar com Google
            </button>

            {/* Divisor */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-[#d8cfc0]" />
              <span className="text-[11px] font-semibold text-[#a0917d] tracking-widest">ou</span>
              <div className="flex-1 h-px bg-[#d8cfc0]" />
            </div>

            {/* Link "Problemas para acessar?" */}
            <button
              type="button"
              onClick={() => setShowEmail((v) => !v)}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {showEmail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Problemas para acessar?
            </button>

            {/* Formulário e-mail (expansível) */}
            {showEmail && (
              <form onSubmit={handleEmailSignIn} className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input
                  type="email"
                  placeholder="E-mail corporativo"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  className="h-11 bg-white border-[#d8cfc0] focus:border-primary"
                />
                <Input
                  type="password"
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-11 bg-white border-[#d8cfc0] focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetState !== 'idle' || isLoading}
                  className="self-end text-[12px] text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                >
                  {resetState === 'sending' ? 'Enviando...' : resetState === 'sent' ? 'E-mail enviado ✓' : 'Esqueci minha senha'}
                </button>
                <Button type="submit" className="h-11 font-bold" disabled={isLoading || !email || !password}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
                {resetState === 'sent' && (
                  <p className="text-xs text-center text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    Se este e-mail estiver cadastrado, você receberá as instruções.
                  </p>
                )}
                {resetError && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{resetError}</p>
                )}
              </form>
            )}

            {/* Erros gerais */}
            {displayError && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive">{displayError}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-[10px] text-[#a0917d] text-center pb-5 select-none tracking-widest uppercase">
          © {new Date().getFullYear()} Sebratel · Uso interno
        </p>
      </div>

    </div>
  )
}
