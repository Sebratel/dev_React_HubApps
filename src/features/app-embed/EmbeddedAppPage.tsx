import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2, Maximize2, RotateCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useApps } from '@/features/dashboard/hooks/useApps'
import { resolveLaunchUrl } from '@/services/app.service'
import { Button } from '@/components/ui/button'

/**
 * Abre um app dentro do Hub (iframe). Cada montagem pede um token SSO novo de 5 min,
 * então recarregar a página do Hub também renova o acesso.
 * O app embutido precisa aceitar o Hub em `Content-Security-Policy: frame-ancestors`.
 */
export function EmbeddedAppPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { userApps, isLoading } = useApps()
  const app = userApps.find((a) => a.id === id)

  const containerRef = useRef<HTMLDivElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const appId = app?.id
  const canEmbed = !!app?.embed

  useEffect(() => {
    if (!app || !user || !canEmbed) return
    if (!app.url) {
      setError('Este aplicativo não tem endereço cadastrado.')
      return
    }
    let cancelled = false
    setSrc(null)
    setError(null)
    setFrameLoaded(false)
    resolveLaunchUrl(app, user)
      .then((url) => { if (!cancelled) setSrc(url) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao obter acesso ao aplicativo')
      })
    return () => { cancelled = true }
    // Só renova o token quando muda o app ou o usuário pede recarga — refetch da lista não recarrega o iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, canEmbed, reloadKey])

  async function openInNewTab() {
    if (!app || !user) return
    try {
      const url = await resolveLaunchUrl(app, user)
      if (url !== '#') window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir o aplicativo')
    }
  }

  function goFullscreen() {
    containerRef.current?.requestFullscreen?.().catch(() => { /* navegador recusou */ })
  }

  if (!user) return null

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-medium">Aplicativo não encontrado ou sem acesso.</p>
        <Link to="/" className="text-sm text-primary underline underline-offset-2">
          Voltar para os aplicativos
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} aria-label="Voltar para os aplicativos">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Voltar</span>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">{app.name}</h1>
        {canEmbed ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReloadKey((k) => k + 1)}
              aria-label="Recarregar aplicativo"
              title="Recarregar"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goFullscreen} aria-label="Tela cheia" title="Tela cheia">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </>
        ) : null}
      </div>

      <div ref={containerRef} className="relative flex flex-1 min-h-0 bg-background">
        {!canEmbed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm">Este aplicativo abre em uma aba separada.</p>
            <Button size="sm" onClick={openInNewTab}>
              <ExternalLink className="h-4 w-4" />
              Abrir {app.name}
            </Button>
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-medium" role="alert">Não foi possível abrir “{app.name}”: {error}</p>
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              <RotateCw className="h-4 w-4" />
              Tentar de novo
            </Button>
          </div>
        ) : (
          <>
            {(!src || !frameLoaded) && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" aria-label="Abrindo aplicativo" />
              </div>
            )}
            {src && (
              <iframe
                key={src}
                src={src}
                title={app.name}
                className="h-full w-full flex-1 border-0"
                allow="clipboard-read; clipboard-write; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setFrameLoaded(true)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
