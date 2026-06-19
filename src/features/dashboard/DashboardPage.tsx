import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Search, PackageOpen, Sunrise, Sun, Moon, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { useApps } from './hooks/useApps'
import { BookCard } from './components/BookCard'
import { FeaturedBanner } from './components/FeaturedBanner'
import { AppManual } from './components/AppManual'
import { AccessRequestModal } from './components/AccessRequestModal'
import { Input } from '@/components/ui/input'
import { buildAppUrl, requestAppLaunchToken } from '@/services/app.service'
import { getHighlights } from '@/services/highlight.service'
import { getManuals } from '@/services/manual.service'
import { logAppOpen } from '@/services/audit-log.service'
import { useFavoritesSync } from './hooks/useFavoritesSync'
import { usePendingRequestAppIds } from './hooks/usePendingRequestAppIds'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

type Tab = 'todos' | 'favoritos' | 'recentes' | 'bloqueados'

function getGreeting(): { label: string; Icon: typeof Sun } {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return { label: 'Bom dia', Icon: Sunrise }
  if (h >= 12 && h < 18) return { label: 'Boa tarde', Icon: Sun }
  return { label: 'Boa noite', Icon: Moon }
}

function formatToday(): string {
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date())
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function HeroAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
  return (
    <div className="relative shrink-0">
      <div
        className="absolute -inset-1 rounded-2xl"
        style={{ background: 'hsl(var(--primary) / 0.18)', filter: 'blur(8px)' }}
        aria-hidden
      />
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-primary/15 shadow-sm">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{initials || '?'}</span>
        )}
      </div>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 185px))' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="min-h-[200px] w-full rounded-3xl bg-muted/60 animate-pulse" />
      ))}
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'todos',     label: 'Todos'      },
  { key: 'favoritos', label: 'Favoritos'  },
  { key: 'recentes',  label: 'Recentes'   },
  { key: 'bloqueados', label: 'Sem acesso' },
]

const EMPTY: Record<Tab, { label: string; hint: string }> = {
  todos:     { label: 'Nenhum aplicativo disponível.',      hint: 'Entre em contato com o administrador.' },
  favoritos: { label: 'Sem favoritos ainda.',               hint: 'Clique na estrela em qualquer app para salvar.' },
  recentes:  { label: 'Nenhum app aberto recentemente.',    hint: 'Seus últimos acessos aparecerão aqui.' },
  bloqueados:{ label: 'Todos os apps estão disponíveis.',   hint: '' },
}

export function DashboardPage() {
  useFavoritesSync()
  const reduced = useReducedMotion()

  const user        = useAuthStore((s) => s.user)
  const favorites   = useAppsStore((s) => s.favorites)
  const toggleFavorite = useAppsStore((s) => s.toggleFavorite)
  const markRecent  = useAppsStore((s) => s.markRecent)

  const { userApps, blockedApps, recentApps, favoriteApps, isLoading, error } = useApps()
  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights'],
    queryFn: getHighlights,
    staleTime: 5 * 60_000,
    enabled: !!user,
  })
  const { data: manuals = [] } = useQuery({
    queryKey: ['manuals'],
    queryFn: getManuals,
    staleTime: 10 * 60_000,
    enabled: !!user,
  })
  const pendingAppIds = usePendingRequestAppIds()

  const [search,     setSearch]     = useState('')
  const [activeTab,  setActiveTab]  = useState<Tab>('todos')
  const [requestApp, setRequestApp] = useState<AppItemModel | null>(null)
  const [notice,     setNotice]     = useState<string | null>(null)
  const [ssoLoadingId, setSsoLoadingId] = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const searchTerm = search.trim()
  const isSearching = searchTerm !== ''

  const searchResults = useMemo(() => {
    if (!isSearching) return null
    const normalized = searchTerm.toLowerCase()
    const matches = (a: AppItemModel) =>
      a.name.toLowerCase().includes(normalized) || a.description.toLowerCase().includes(normalized)
    const accessible = userApps.filter(matches)
    const blocked    = blockedApps.filter(matches)
    return { accessible, blocked, total: accessible.length + blocked.length }
  }, [userApps, blockedApps, searchTerm, isSearching])

  const tabApps = useMemo((): AppItemModel[] => {
    switch (activeTab) {
      case 'todos':      return userApps
      case 'favoritos':  return favoriteApps
      case 'recentes':   return recentApps
      case 'bloqueados': return blockedApps
    }
  }, [activeTab, userApps, favoriteApps, recentApps, blockedApps])

  const tabCounts: Record<Tab, number> = {
    todos:      userApps.length,
    favoritos:  favoriteApps.length,
    recentes:   recentApps.length,
    bloqueados: blockedApps.length,
  }

  async function handleOpenApp(app: AppItemModel) {
    if (!user || ssoLoadingId) return

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

  const { label: greetingLabel, Icon: GreetingIcon } = getGreeting()
  const firstName = user.name?.split(' ')[0] ?? user.email.split('@')[0] ?? 'usuário'

  const sharedCardProps = {
    onOpen: handleOpenApp,
    onRequestAccess: setRequestApp,
    onToggleFavorite: toggleFavorite,
  }

  return (
    <div className="relative flex flex-col gap-5">
      {/* Atmospheric blur spheres */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full"
          style={{ background: 'hsl(var(--primary) / 0.05)', filter: 'blur(80px)' }}
        />
        <div
          className="absolute -left-32 top-1/2 h-72 w-72 rounded-full"
          style={{ background: 'hsl(var(--primary) / 0.035)', filter: 'blur(80px)' }}
        />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <motion.section
        className="relative overflow-hidden rounded-3xl"
        style={{
          backgroundColor: 'rgba(255,255,255,0.42)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.85)',
        }}
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full"
          style={{ background: 'hsl(var(--primary) / 0.10)', filter: 'blur(60px)' }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-4 p-6 sm:p-8">
          {/* Greeting chip + date */}
          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/[0.12] px-3 py-1">
              <GreetingIcon className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="text-xs font-semibold text-primary">{greetingLabel}</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">{formatToday()}</span>
          </motion.div>

          {/* Avatar + name */}
          <motion.div
            className="flex items-center gap-4"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: reduced ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroAvatar name={user.name ?? firstName} photoUrl={user.photoUrl} />
            <div className="flex flex-col gap-1">
              <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2rem]">
                Bem-vindo,{' '}
                <motion.span
                  className="text-primary"
                  initial={reduced ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.32, delay: reduced ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {firstName}
                </motion.span>
                <span className="text-primary">.</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Sua biblioteca de aplicativos, tudo em um só lugar.
              </p>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            className="relative w-full sm:max-w-[460px]"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: reduced ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <Input
              placeholder="Buscar aplicativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'peer h-11 w-full rounded-2xl border-white/60 bg-white/55 pl-10 transition-colors duration-[160ms] focus-visible:bg-white/80',
                search && 'pr-10',
              )}
              aria-label="Buscar aplicativo"
              aria-live="polite"
            />
            <Search
              className={cn(
                'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
                'text-muted-foreground/65',
                'transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
                'peer-focus:translate-x-px peer-focus:text-primary',
              )}
              aria-hidden
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground/30"
                  aria-label="Limpar busca"
                >
                  <X className="h-3 w-3" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.section>

      {/* Banners de erro e SSO */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar aplicativos. Tente recarregar a página.
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
          {notice}
        </div>
      )}

      {/* ── Conteúdo principal ───────────────────────────────────────────────── */}
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
            className="flex flex-col gap-5"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Destaques */}
            {highlights.length > 0 && <FeaturedBanner highlights={highlights} />}

            {isSearching && searchResults ? (
              /* Modo busca */
              <motion.div
                key="search"
                className="flex flex-col gap-4"
                initial={reduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-sm text-muted-foreground">
                  {searchResults.total === 0
                    ? 'Nenhum resultado para a busca.'
                    : `${searchResults.total} resultado${searchResults.total !== 1 ? 's' : ''} encontrado${searchResults.total !== 1 ? 's' : ''}`}
                </p>

                {searchResults.total === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center" role="status" aria-live="polite">
                    <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum aplicativo encontrado</p>
                    <p className="text-xs text-muted-foreground/70">Tente buscar por outro nome ou descrição.</p>
                  </div>
                ) : (
                  <div
                    className="grid gap-5"
                    style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 185px))' }}
                    aria-live="polite"
                  >
                    {searchResults.accessible.map((app, i) => (
                      <BookCard key={app.id} app={app} hasAccess={true} isFavorite={favorites.includes(app.id)} isPending={false} index={i} {...sharedCardProps} />
                    ))}
                    {searchResults.blocked.map((app, i) => (
                      <BookCard key={app.id} app={app} hasAccess={false} isFavorite={false} isPending={pendingAppIds.has(app.id)} index={searchResults.accessible.length + i} {...sharedCardProps} />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              /* Modo abas */
              <motion.div
                key="tabs"
                className="flex flex-col gap-5"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Tab bar */}
                <div
                  className="flex gap-1 rounded-2xl p-1"
                  style={{
                    background: 'rgba(255,255,255,0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.65)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                  role="tablist"
                  aria-label="Filtrar aplicativos"
                >
                  {TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      role="tab"
                      aria-selected={activeTab === key}
                      onClick={() => setActiveTab(key)}
                      className={cn(
                        'relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150',
                        activeTab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {activeTab === key && (
                        <motion.div
                          layoutId="tab-pill"
                          className="absolute inset-0 rounded-xl bg-white shadow-sm"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{label}</span>
                      {tabCounts[key] > 0 && (
                        <span className={cn('relative z-10 text-[11px] font-semibold tabular-nums', activeTab === key ? 'text-primary' : 'text-muted-foreground/50')}>
                          {tabCounts[key]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Grid com transição entre abas */}
                <AnimatePresence mode="wait">
                  {tabApps.length === 0 ? (
                    <motion.div
                      key={`empty-${activeTab}`}
                      className="flex flex-col items-center justify-center gap-3 py-16 text-center"
                      initial={reduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      role="status"
                    >
                      <PackageOpen className="h-10 w-10 text-muted-foreground/40" aria-hidden />
                      <p className="text-sm font-medium text-muted-foreground">{EMPTY[activeTab].label}</p>
                      {EMPTY[activeTab].hint && (
                        <p className="text-xs text-muted-foreground/60">{EMPTY[activeTab].hint}</p>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`grid-${activeTab}`}
                      className="grid gap-5"
                      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 185px))' }}
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduced ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {tabApps.map((app, i) => (
                        <BookCard
                          key={app.id}
                          app={app}
                          hasAccess={activeTab !== 'bloqueados'}
                          isFavorite={favorites.includes(app.id)}
                          isPending={activeTab === 'bloqueados' && pendingAppIds.has(app.id)}
                          index={i}
                          {...sharedCardProps}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual do Colaborador */}
      <AppManual manuals={manuals} />

      {/* Modal de solicitação de acesso */}
      <AccessRequestModal app={requestApp} open={requestApp !== null} onClose={() => setRequestApp(null)} />
    </div>
  )
}
