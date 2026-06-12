import { useState, useMemo, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { useApps } from './hooks/useApps'
import { AppGrid } from './components/AppGrid'
import { AccessRequestModal } from './components/AccessRequestModal'
import { Input } from '@/components/ui/input'
import { buildAppUrl, requestAppLaunchToken } from '@/services/app.service'
import { logAppOpen } from '@/services/audit-log.service'
import { useFavoritesSync } from './hooks/useFavoritesSync'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

type DashboardTab = 'all' | 'favorites' | 'recent'

export function DashboardPage() {
  useFavoritesSync()
  const user = useAuthStore((s) => s.user)
  const favorites = useAppsStore((s) => s.favorites)
  const toggleFavorite = useAppsStore((s) => s.toggleFavorite)
  const markRecent = useAppsStore((s) => s.markRecent)

  const { userApps, blockedApps, favoriteApps, recentApps, isLoading, error } = useApps()

  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<DashboardTab>('all')
  const [requestApp, setRequestApp] = useState<AppItemModel | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [ssoLoadingId, setSsoLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const { visibleApps, visibleBlocked } = useMemo(() => {
    const term = search.trim().toLowerCase()
    const matches = (a: AppItemModel) =>
      !term || a.name.toLowerCase().includes(term) || a.description.toLowerCase().includes(term)

    if (activeTab === 'favorites') {
      return { visibleApps: favoriteApps.filter(matches), visibleBlocked: [] }
    }
    if (activeTab === 'recent') {
      return { visibleApps: recentApps.filter(matches), visibleBlocked: [] }
    }
    return {
      visibleApps: userApps.filter(matches),
      visibleBlocked: blockedApps.filter(matches),
    }
  }, [userApps, blockedApps, favoriteApps, recentApps, activeTab, search])

  async function handleOpenApp(app: AppItemModel) {
    if (!user) return
    if (ssoLoadingId) return

    if (app.passToken) {
      setSsoLoadingId(app.id)
      setNotice(`Autenticando acesso a "${app.name}"...`)
      try {
        const { token } = await requestAppLaunchToken(app.id)
        const sep = app.url && app.url.includes('?') ? '&' : '?'
        const finalUrl = `${app.url}${sep}sso_token=${encodeURIComponent(token)}`
        markRecent(app.id)
        logAppOpen(user, app).catch((e) => console.error('[audit]', e))
        window.open(finalUrl, '_blank', 'noopener,noreferrer')
        setNotice(null)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao obter token SSO'
        setNotice(`Erro ao abrir "${app.name}": ${msg}`)
      } finally {
        setSsoLoadingId(null)
      }
      return
    }

    const url = buildAppUrl(app, user.id, user.name, user.email)
    if (url === '#') return

    markRecent(app.id)
    logAppOpen(user, app).catch((e) => console.error('[audit]', e))
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const tabs: { id: DashboardTab; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: userApps.length + blockedApps.length },
    { id: 'favorites', label: 'Favoritos', count: favoriteApps.length },
    { id: 'recent', label: 'Recentes', count: recentApps.length },
  ]

  if (!user) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user.name.split(' ')[0] || 'usuário'} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? 'Carregando aplicativos...'
            : `${userApps.length} aplicativo${userApps.length !== 1 ? 's' : ''} disponíve${userApps.length !== 1 ? 'is' : 'l'}`}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar aplicativos. Tente recarregar a página.
        </div>
      )}

      {/* SSO / passToken notice (auto-dismisses after 4 s) */}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {notice}
        </div>
      )}

      {/* Search */}
      <Input
        placeholder="Buscar aplicativo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-sebratel-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* App grid */}
      <AppGrid
        apps={visibleApps}
        blockedApps={visibleBlocked}
        favorites={favorites}
        isLoading={isLoading}
        onOpen={handleOpenApp}
        onRequestAccess={setRequestApp}
        onToggleFavorite={toggleFavorite}
        emptyMessage={
          activeTab === 'favorites'
            ? 'Nenhum favorito ainda. Marque aplicativos com ⭐ para adicioná-los aqui.'
            : activeTab === 'recent'
              ? 'Nenhum aplicativo acessado recentemente.'
              : search
                ? `Nenhum resultado para "${search}".`
                : 'Nenhum aplicativo disponível.'
        }
      />

      {/* Access request modal */}
      <AccessRequestModal
        app={requestApp}
        open={requestApp !== null}
        onClose={() => setRequestApp(null)}
      />
    </div>
  )
}
