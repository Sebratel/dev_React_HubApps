import { useState, useMemo, useEffect } from 'react'
import { Search, PackageOpen, Sunrise, Sun, Moon, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useAppsStore } from '@/stores/apps.store'
import { useApps } from './hooks/useApps'
import { BookCard } from './components/BookCard'
import { FeaturedBanner } from './components/FeaturedBanner'
import { AppManual } from './components/AppManual'
import { Input } from '@/components/ui/input'
import { buildAppUrl, requestAppLaunchToken } from '@/services/app.service'
import { getHighlights } from '@/services/highlight.service'
import { getManuals } from '@/services/manual.service'
import { logAppOpen } from '@/services/audit-log.service'
import { useFavoritesSync } from './hooks/useFavoritesSync'
import { SocialPanel } from '@/features/social/SocialPanel'
import { BirthdayConfetti } from '@/components/BirthdayConfetti'
import { isBirthdayToday } from '@/utils/isBirthdayToday'
import { OnboardingChecklist } from '@/features/onboarding/OnboardingChecklist'
import { SendKudoDialog } from '@/features/kudos/SendKudoDialog'
import { cn } from '@/lib/utils'
import type { AppItemModel } from '@/types/models'

type Tab = 'todos' | 'favoritos' | 'recentes'

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
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#FFF1CC]">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-base font-bold text-[#8A5A00]">{initials || '?'}</span>
      )}
    </div>
  )
}

/** Cartões de ~156 px: 7 por linha numa tela de 1280 px. */
const GRID_STYLE = { gridTemplateColumns: 'repeat(auto-fill, minmax(156px, 1fr))' }

function LoadingGrid() {
  return (
    <div className="grid gap-3" style={GRID_STYLE}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="min-h-[132px] w-full rounded-[14px] bg-muted/60 animate-pulse" />
      ))}
    </div>
  )
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'todos',     label: 'Todos'     },
  { key: 'favoritos', label: 'Favoritos' },
  { key: 'recentes',  label: 'Recentes'  },
]

const EMPTY: Record<Tab, { label: string; hint: string }> = {
  todos:     { label: 'Nenhum aplicativo disponível.',   hint: 'Entre em contato com o administrador.' },
  favoritos: { label: 'Sem favoritos ainda.',            hint: 'Clique na estrela em qualquer app para salvar.' },
  recentes:  { label: 'Nenhum app aberto recentemente.', hint: 'Seus últimos acessos aparecerão aqui.' },
}

export function DashboardPage() {
  useFavoritesSync()

  const user           = useAuthStore((s) => s.user)
  const favorites      = useAppsStore((s) => s.favorites)
  const toggleFavorite = useAppsStore((s) => s.toggleFavorite)
  const markRecent     = useAppsStore((s) => s.markRecent)
  const navigate       = useNavigate()

  const { userApps, recentApps, favoriteApps, isLoading, error } = useApps()

  const { data: highlights = [] } = useQuery({
    queryKey: ['highlights'],
    queryFn:  getHighlights,
    staleTime: 5 * 60_000,
    enabled:   !!user,
  })
  const { data: manuals = [] } = useQuery({
    queryKey: ['manuals'],
    queryFn:  getManuals,
    staleTime: 10 * 60_000,
    enabled:   !!user,
  })

  const [kudoDialogOpen, setKudoDialogOpen] = useState(false)
  const [search,         setSearch]         = useState('')
  const [activeTab,      setActiveTab]      = useState<Tab>('todos')
  const [notice,         setNotice]         = useState<string | null>(null)
  const [ssoLoadingId,   setSsoLoadingId]   = useState<string | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const searchTerm  = search.trim()
  const isSearching = searchTerm !== ''

  const searchResults = useMemo(() => {
    if (!isSearching) return null
    const normalized = searchTerm.toLowerCase()
    const matches = (a: AppItemModel) =>
      a.name.toLowerCase().includes(normalized) || a.description.toLowerCase().includes(normalized)
    const accessible = userApps.filter(matches)
    return { accessible, total: accessible.length }
  }, [userApps, searchTerm, isSearching])

  const tabApps = useMemo((): AppItemModel[] => {
    switch (activeTab) {
      case 'todos':     return userApps
      case 'favoritos': return favoriteApps
      case 'recentes':  return recentApps
    }
  }, [activeTab, userApps, favoriteApps, recentApps])

  const tabCounts: Record<Tab, number> = {
    todos:     userApps.length,
    favoritos: favoriteApps.length,
    recentes:  recentApps.length,
  }

  async function handleOpenApp(app: AppItemModel) {
    if (!user || ssoLoadingId) return

    // App embutido: abre dentro do Hub; a página /app/:id pede o token SSO e monta o iframe.
    if (app.embed) {
      markRecent(app.id)
      logAppOpen(user, app).catch((e) => console.error('[audit]', e))
      navigate(`/app/${app.id}`)
      return
    }

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

  const isMyBirthday = isBirthdayToday(user.birthDate)
  const { label: greetingLabel, Icon: GreetingIcon } = getGreeting()
  const firstName = user.name?.split(' ')[0] ?? user.email.split('@')[0] ?? 'usuário'

  const sharedCardProps = {
    onOpen:            handleOpenApp,
    onToggleFavorite:  toggleFavorite,
    onRequestAccess:   () => {}, // todos os apps são acessíveis — prop mantida para compatibilidade de tipo
  }

  const renderGrid = (apps: AppItemModel[]) => (
    <div className="grid gap-3" style={GRID_STYLE} aria-live="polite">
      {apps.map((app) => (
        <BookCard
          key={app.id}
          app={app}
          hasAccess={true}
          isFavorite={favorites.includes(app.id)}
          isPending={false}
          {...sharedCardProps}
        />
      ))}
    </div>
  )

  return (
    <div className="relative pb-6">
      {/* Confetti de aniversário */}
      {isMyBirthday && <BirthdayConfetti />}

      <div className="flex flex-col gap-4">

        {/* Boas-vindas + busca, numa faixa só */}
        <section
          className={cn(
            'relative flex flex-wrap items-center gap-x-6 gap-y-4 overflow-hidden rounded-2xl border bg-card px-5 py-4',
            'shadow-[0_2px_10px_-4px_rgba(120,60,0,0.10)]',
            isMyBirthday ? 'border-amber-300/70 bg-amber-50/60' : 'border-[#EDE6D8]',
          )}
        >
          {isMyBirthday && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f97316, #fbbf24, #f59e0b)' }}
              aria-hidden
            />
          )}

          <div className="flex min-w-0 items-center gap-3.5">
            <HeroAvatar name={user.name ?? firstName} photoUrl={user.photoUrl} />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                {isMyBirthday ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <span aria-hidden>🎂</span> Feliz Aniversário!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1CC] px-2.5 py-0.5 text-xs font-semibold text-[#7A5000]">
                    <GreetingIcon className="h-3 w-3" aria-hidden />
                    {greetingLabel}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatToday()}</span>
              </div>
              <h1 className="text-[22px] font-bold leading-tight tracking-tight text-foreground">
                {isMyBirthday ? 'Feliz Aniversário,' : 'Bem-vindo,'}{' '}
                {/* #A86F00: o âmbar da marca não tem contraste legível sobre o branco */}
                <span className={isMyBirthday ? 'text-amber-600' : 'text-[#A86F00]'}>{firstName}</span>
                {isMyBirthday ? '! 🎉' : '.'}
              </h1>
              {isMyBirthday && (
                <p className="text-sm text-muted-foreground">
                  Que seu dia seja incrível! Seus colegas estão aqui para comemorar com você. 🥳
                </p>
              )}
            </div>
          </div>

          <div className="relative w-full sm:ml-auto sm:w-auto sm:min-w-[260px] sm:flex-[0_1_380px]">
            <Input
              placeholder="Buscar aplicativo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'peer h-10 w-full rounded-xl border-[#E6DDCB] bg-[#FBF8F2] pl-10 transition-colors duration-150 focus-visible:bg-white',
                search && 'pr-10',
              )}
              aria-label="Buscar aplicativo"
            />
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 peer-focus:text-primary"
              aria-hidden
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground/30"
                aria-label="Limpar busca"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            )}
          </div>
        </section>

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

        {/* Checklist de onboarding (fechado por padrão) */}
        <OnboardingChecklist onOpenSendKudo={() => setKudoDialogOpen(true)} />

        {isLoading ? (
          <LoadingGrid />
        ) : (
          <>
            {highlights.length > 0 && <FeaturedBanner highlights={highlights} />}

            {isSearching && searchResults ? (
              <section aria-label="Resultado da busca" className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground" role="status">
                  {searchResults.total === 0
                    ? 'Nenhum resultado para a busca.'
                    : `${searchResults.total} resultado${searchResults.total !== 1 ? 's' : ''} encontrado${searchResults.total !== 1 ? 's' : ''}`}
                </p>
                {searchResults.total === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <PackageOpen className="h-12 w-12 text-muted-foreground/40" aria-hidden />
                    <p className="text-sm font-medium text-muted-foreground">Nenhum aplicativo encontrado</p>
                    <p className="text-xs text-muted-foreground/70">Tente buscar por outro nome ou descrição.</p>
                  </div>
                ) : (
                  renderGrid(searchResults.accessible)
                )}
              </section>
            ) : (
              <section aria-label="Aplicativos" className="mt-1 flex flex-col gap-3.5">
                <div
                  className="inline-flex max-w-full gap-1 self-start overflow-x-auto rounded-xl border border-[#EDE6D8] bg-white p-1 scrollbar-none"
                  role="tablist"
                  aria-label="Filtrar aplicativos"
                >
                  {TABS.map(({ key, label }) => {
                    const active = activeTab === key
                    return (
                      <button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(key)}
                        className={cn(
                          'inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-[13px] transition-colors duration-150',
                          active
                            ? 'bg-[#FFF1CC] font-semibold text-[#2d1800]'
                            : 'font-medium text-muted-foreground hover:bg-[#F3EDE0] hover:text-foreground',
                        )}
                      >
                        {label}
                        {tabCounts[key] > 0 && (
                          <span className={cn('text-xs tabular-nums', active ? 'text-[#8A5A00]' : 'text-muted-foreground')}>
                            {tabCounts[key]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {tabApps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center" role="status">
                    <PackageOpen className="h-10 w-10 text-muted-foreground/40" aria-hidden />
                    <p className="text-sm font-medium text-muted-foreground">{EMPTY[activeTab].label}</p>
                    {EMPTY[activeTab].hint && (
                      <p className="text-xs text-muted-foreground/70">{EMPTY[activeTab].hint}</p>
                    )}
                  </div>
                ) : (
                  renderGrid(tabApps)
                )}
              </section>
            )}
          </>
        )}

        {/* Manual do Colaborador */}
        <AppManual manuals={manuals} />

      </div>

      {/* Painel social flutuante */}
      <SocialPanel />

      {/* Diálogos */}
      <SendKudoDialog open={kudoDialogOpen} onClose={() => setKudoDialogOpen(false)} />
    </div>
  )
}
