import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

const GRID = 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'

// Header de seção com linha divisória animada
function SectionHeader({
  title,
  count,
  variant = 'primary',
  delay = 0,
}: {
  title: string
  count: number
  variant?: 'primary' | 'secondary'
  delay?: number
}) {
  const reduced = useReducedMotion()
  return (
    <div
      className={cn('mb-4', !reduced && 'animate-fade-in')}
      style={reduced ? undefined : { animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-baseline justify-between pb-2">
        <span
          className={cn(
            'text-sm font-semibold',
            variant === 'primary' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {title}
        </span>
        <span className={cn('text-xs', variant === 'primary' ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
          {count} app{count !== 1 ? 's' : ''}
        </span>
      </div>
      <motion.div
        className="h-px bg-border"
        style={{ originX: 0 }}
        initial={reduced ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.28, delay: reduced ? 0 : delay / 1000 + 0.04, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  )
}

// Skeleton grid para estado de loading (usado diretamente na página)
function LoadingGrid() {
  return (
    <div className={cn(GRID)}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 min-h-[180px]">
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-4 rounded-full bg-muted animate-pulse mt-0.5" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-9 w-full rounded-md bg-muted animate-pulse mt-auto" />
        </div>
      ))}
    </div>
  )
}

export function DashboardPage() {
  useFavoritesSync()
  const reduced = useReducedMotion()

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
      {/* Zona 1 — Header: título + busca */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-2xl font-bold text-foreground shrink-0">Aplicativos</h1>
        <div className="relative w-full sm:flex-1">
          {/* Input first for peer-focus CSS trick */}
          <Input
            placeholder="Buscar aplicativo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="peer pl-9 w-full transition-colors duration-[160ms]"
            aria-label="Buscar aplicativo"
            aria-live="polite"
          />
          <Search
            className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none',
              'text-muted-foreground/65',
              'transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
              'peer-focus:text-muted-foreground peer-focus:translate-x-px',
            )}
            aria-hidden
          />
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar aplicativos. Tente recarregar a página.
        </div>
      )}

      {/* SSO / passToken notice */}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700"
        >
          {notice}
        </div>
      )}

      {/* Conteúdo principal */}
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key="loading"
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <LoadingGrid />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Transição entre modo normal e modo de busca — sem AnimatePresence para não bloquear unmount */}
              {isSearching && searchResults ? (
                /* Modo busca */
                <motion.div
                  key="search"
                  className="flex flex-col gap-4"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SectionHeader
                    title="Resultados da busca"
                    count={searchResults.total}
                    variant="primary"
                  />

                  {searchResults.total === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center gap-3 py-20 text-center"
                      role="status"
                      aria-live="polite"
                    >
                      <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground">
                        Nenhum aplicativo encontrado
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Tente buscar por outro nome ou descrição.
                      </p>
                    </div>
                  ) : (
                    <div className={GRID} aria-live="polite">
                      {searchResults.accessible.map((app, i) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          hasAccess={true}
                          isFavorite={favorites.includes(app.id)}
                          isPending={false}
                          index={i}
                          {...sharedCardProps}
                        />
                      ))}
                      {searchResults.blocked.map((app, i) => (
                        <AppCard
                          key={app.id}
                          app={app}
                          hasAccess={false}
                          isFavorite={false}
                          isPending={pendingAppIds.has(app.id)}
                          index={searchResults.accessible.length + i}
                          {...sharedCardProps}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* Modo normal */
                <motion.div
                  key="normal"
                  className="flex flex-col gap-6"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                >
                  {/* Favoritos */}
                  {favoritesSection.length > 0 && (
                    <section aria-label="Favoritos">
                      <SectionHeader title="Favoritos" count={favoritesSection.length} delay={40} />
                      <AppGrid apps={favoritesSection} blockedApps={[]} {...sharedGridProps} />
                    </section>
                  )}

                  {/* Recentes */}
                  {recentsSection.length > 0 && (
                    <section aria-label="Recentes">
                      <SectionHeader title="Recentes" count={recentsSection.length} delay={favoritesSection.length > 0 ? 80 : 40} />
                      <AppGrid apps={recentsSection} blockedApps={[]} {...sharedGridProps} />
                    </section>
                  )}

                  {/* Todos os aplicativos */}
                  <section aria-label="Todos os aplicativos">
                    <SectionHeader
                      title="Todos os aplicativos"
                      count={userApps.length}
                      delay={
                        (favoritesSection.length > 0 ? 40 : 0) +
                        (recentsSection.length > 0 ? 40 : 0) +
                        40
                      }
                    />
                    <AppGrid
                      apps={userApps}
                      blockedApps={[]}
                      {...sharedGridProps}
                      emptyMessage="Nenhum aplicativo disponível."
                    />
                  </section>

                  {/* Solicitar acesso */}
                  {blockedApps.length > 0 && (
                    <AppGrid apps={[]} blockedApps={blockedApps} {...sharedGridProps} />
                  )}
                </motion.div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de solicitação de acesso */}
      <AccessRequestModal
        app={requestApp}
        open={requestApp !== null}
        onClose={() => setRequestApp(null)}
      />
    </div>
  )
}
