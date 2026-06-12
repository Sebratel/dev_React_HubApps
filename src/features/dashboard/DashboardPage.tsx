import { useState, useMemo, useEffect } from 'react'
import { Search, PackageOpen } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { useApps } from './hooks/useApps'
import { AppGrid } from './components/AppGrid'
import { AppCard } from './components/AppCard'
import { AccessRequestModal } from './components/AccessRequestModal'
import { Input } from '@/components/ui/input'
import { buildAppUrl, requestAppLaunchToken } from '@/services/app.service'
import { logAppOpen } from '@/services/audit-log.service'
import { useFavoritesSync } from './hooks/useFavoritesSync'
import { usePendingRequestAppIds } from './hooks/usePendingRequestAppIds'
import type { AppItemModel } from '@/types/models'

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

export function DashboardPage() {
  useFavoritesSync()
  const user = useAuthStore((s) => s.user)
  const favorites = useAppsStore((s) => s.favorites)
  const toggleFavorite = useAppsStore((s) => s.toggleFavorite)
  const markRecent = useAppsStore((s) => s.markRecent)

  const { userApps, blockedApps, favoriteApps, recentApps, isLoading, error } = useApps()
  const pendingAppIds = usePendingRequestAppIds()

  const [search, setSearch] = useState('')
  const [requestApp, setRequestApp] = useState<AppItemModel | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [ssoLoadingId, setSsoLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const searchTerm = search.trim()
  const isSearching = searchTerm !== ''

  const { favoritesSection, recentsSection, searchResults } = useMemo(() => {
    const normalized = searchTerm.toLowerCase()
    const matches = (a: AppItemModel) =>
      a.name.toLowerCase().includes(normalized) ||
      a.description.toLowerCase().includes(normalized)

    const favoritesSection = favoriteApps.slice(0, 4)
    const recentsSection = recentApps
      .filter((app) => !favorites.includes(app.id))
      .slice(0, 4)

    if (!isSearching) {
      return { favoritesSection, recentsSection, searchResults: null }
    }

    const accessible = userApps.filter(matches)
    const blocked = blockedApps.filter(matches)
    return {
      favoritesSection,
      recentsSection,
      searchResults: {
        accessible,
        blocked,
        total: accessible.length + blocked.length,
      },
    }
  }, [favoriteApps, recentApps, userApps, blockedApps, favorites, searchTerm, isSearching])

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

  if (!user) return null

  const sharedCardProps = {
    onOpen: handleOpenApp,
    onRequestAccess: setRequestApp,
    onToggleFavorite: toggleFavorite,
  }

  const sharedGridProps = {
    favorites,
    pendingAppIds,
    isLoading: false as const,
    ...sharedCardProps,
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Zona 1 — Header integrado: título + busca */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground shrink-0">Aplicativos</h1>
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            placeholder="Buscar aplicativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
            aria-label="Buscar aplicativo"
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar aplicativos. Tente recarregar a página.
        </div>
      )}

      {/* SSO / passToken notice (auto-dismiss em 4s) */}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          {notice}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <AppGrid
          apps={[]}
          blockedApps={[]}
          {...sharedGridProps}
          isLoading={true}
        />
      )}

      {/* Modo de busca — seção única consolidada */}
      {!isLoading && isSearching && searchResults && (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between pb-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Resultados da busca</span>
            <span className="text-xs text-muted-foreground">
              {searchResults.total} app{searchResults.total !== 1 ? 's' : ''}
            </span>
          </div>
          {searchResults.total === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-3 py-20 text-center"
              role="status"
            >
              <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden />
              <p className="text-sm text-muted-foreground">
                Nenhum resultado para &ldquo;{search}&rdquo;.
              </p>
            </div>
          ) : (
            <div className={GRID}>
              {searchResults.accessible.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  hasAccess={true}
                  isFavorite={favorites.includes(app.id)}
                  isPending={false}
                  {...sharedCardProps}
                />
              ))}
              {searchResults.blocked.map((app) => (
                <AppCard
                  key={app.id}
                  app={app}
                  hasAccess={false}
                  isFavorite={false}
                  isPending={pendingAppIds.has(app.id)}
                  {...sharedCardProps}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Seções permanentes (modo normal, sem busca ativa) */}
      {!isLoading && !isSearching && (
        <>
          {/* Favoritos — apenas quando houver itens, limitado a 4 */}
          {favoritesSection.length > 0 && (
            <section aria-label="Favoritos">
              <div className="flex items-baseline justify-between pb-2 border-b border-border mb-4">
                <span className="text-sm font-semibold text-foreground">Favoritos</span>
                <span className="text-xs text-muted-foreground">
                  {favoritesSection.length} app{favoritesSection.length !== 1 ? 's' : ''}
                </span>
              </div>
              <AppGrid apps={favoritesSection} blockedApps={[]} {...sharedGridProps} />
            </section>
          )}

          {/* Recentes — apenas quando houver itens, excluindo favoritos, limitado a 4 */}
          {recentsSection.length > 0 && (
            <section aria-label="Recentes">
              <div className="flex items-baseline justify-between pb-2 border-b border-border mb-4">
                <span className="text-sm font-semibold text-foreground">Recentes</span>
                <span className="text-xs text-muted-foreground">
                  {recentsSection.length} app{recentsSection.length !== 1 ? 's' : ''}
                </span>
              </div>
              <AppGrid apps={recentsSection} blockedApps={[]} {...sharedGridProps} />
            </section>
          )}

          {/* Todos os aplicativos — sempre visível */}
          <section aria-label="Todos os aplicativos">
            <div className="flex items-baseline justify-between pb-2 border-b border-border mb-4">
              <span className="text-sm font-semibold text-foreground">Todos os aplicativos</span>
              <span className="text-xs text-muted-foreground">
                {userApps.length} app{userApps.length !== 1 ? 's' : ''}
              </span>
            </div>
            <AppGrid
              apps={userApps}
              blockedApps={[]}
              {...sharedGridProps}
              emptyMessage="Nenhum aplicativo disponível."
            />
          </section>

          {/* Solicitar acesso — apenas quando houver apps bloqueados */}
          {blockedApps.length > 0 && (
            <AppGrid apps={[]} blockedApps={blockedApps} {...sharedGridProps} />
          )}
        </>
      )}

      {/* Modal de solicitação de acesso */}
      <AccessRequestModal
        app={requestApp}
        open={requestApp !== null}
        onClose={() => setRequestApp(null)}
      />
    </div>
  )
}
