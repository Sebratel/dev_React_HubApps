import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { updateMyStatus } from '@/services/user.service'
import { STATUS_OPTIONS } from '@/utils/statusOptions'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { LayoutGrid, Bell, MessageSquare, ShieldCheck, Menu, X, LogOut, ClipboardList, Users, Newspaper } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/auth.store'
import { SebratelLogo } from '@/components/SebratelLogo'
import { useNotificationsStore } from '@/stores/notifications.store'
import { canAccessAdminDashboard } from '@/utils/permissions'
import { UserAvatar } from '@/components/UserAvatar'
import { useSecureSignOut } from '@/hooks/useSecureSignOut'
import { useHeartbeat } from '@/hooks/useHeartbeat'
import { cn } from '@/lib/utils'
import { getAnnouncements } from '@/services/announcement.service'
import { getUserAccessRequests } from '@/services/access-request.service'
import { getCelebrations } from '@/services/kudos.service'
import type { CelebrationItem } from '@/services/kudos.service'
import { SendKudoDialog } from '@/features/kudos/SendKudoDialog'
import { isBirthdayToday } from '@/utils/isBirthdayToday'

// ─── Toast de aniversário de colegas ─────────────────────────────────────────
const BIRTHDAY_TOAST_KEY = 'hub_birthday_toast_dismissed'
function hasSeenBirthdayToast(): boolean {
  try { return !!sessionStorage.getItem(BIRTHDAY_TOAST_KEY) } catch { return false }
}
function markBirthdayToastSeen() {
  try { sessionStorage.setItem(BIRTHDAY_TOAST_KEY, '1') } catch { /* storage unavailable */ }
}

const NAV_ITEMS = [
  { to: '/',                    label: 'Aplicativos',  icon: LayoutGrid,    end: true  },
  { to: '/pessoas',             label: 'Pessoas',      icon: Users,         end: false },
  { to: '/mural',               label: 'Mural',        icon: Newspaper,     end: false },
  { to: '/avisos',              label: 'Avisos',       icon: Bell,          end: false },
  { to: '/sugestoes',           label: 'Sugestões',    icon: MessageSquare, end: false },
  { to: '/minhas-solicitacoes', label: 'Solicitações', icon: ClipboardList, end: false },
]

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user)
  const secureSignOut = useSecureSignOut()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useHeartbeat()

  // ── Aniversário do usuário logado ──
  const isMyBirthday = isBirthdayToday(user?.birthDate ?? null)

  // ── Celebrações do dia (para o toast de colegas aniversariantes) ──
  const { data: celebrations = [] } = useQuery<CelebrationItem[]>({
    queryKey: ['celebrations'],
    queryFn:  getCelebrations,
    staleTime: 60 * 60_000, // 1 hora
    enabled:   !!user,
  })

  // Colegas que fazem aniversário hoje (excluindo o próprio usuário)
  const birthdayColleagues = celebrations.filter(
    (c) => c.isBirthday && c.id !== user?.id,
  )

  // Toast aparece uma vez por sessão; se o usuário também faz aniversário, priorizamos
  // o banner do Hero — o toast só aparece para outros colegas
  const [toastVisible, setToastVisible] = useState(!hasSeenBirthdayToast())
  const showBirthdayToast = toastVisible && birthdayColleagues.length > 0 && !isMyBirthday

  function dismissToast() {
    markBirthdayToastSeen()
    setToastVisible(false)
  }

  // Kudo dialog pré-preenchido ao clicar "Parabenizar" no toast
  const [kudoTarget, setKudoTarget] = useState<CelebrationItem | null>(null)

  // ── Status do Momento ──
  const [statusPickerOpen, setStatusPickerOpen] = useState(false)
  const statusPickerRef = useRef<HTMLDivElement>(null)
  const setUser = useAuthStore((s) => s.setUser)

  // Fecha o picker ao clicar fora
  useEffect(() => {
    if (!statusPickerOpen) return
    function onClickOutside(e: MouseEvent) {
      if (statusPickerRef.current && !statusPickerRef.current.contains(e.target as Node)) {
        setStatusPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [statusPickerOpen])

  const statusMutation = useMutation({
    mutationFn: (value: string | null) => updateMyStatus(value),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      setStatusPickerOpen(false)
    },
  })

  const readIds = useNotificationsStore((s) => s.readAnnouncementIds)
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: getAnnouncements,
    staleTime: 5 * 60_000,
    enabled: !!user,
  })
  const unreadCount = announcements.filter((a) => !readIds.includes(a.id)).length

  const { data: myRequests = [] } = useQuery({
    queryKey: ['access-requests', 'me'],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn: () => getUserAccessRequests(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  })
  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length

  const badges: Record<string, number> = {
    '/avisos':              unreadCount,
    '/minhas-solicitacoes': pendingRequestsCount,
  }

  return (
    <div className="h-screen overflow-hidden flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          aria-hidden
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      {/* Desktop: static flex item (pushes content naturally). Mobile: fixed overlay drawer. */}
      <aside
        className={cn(
          'flex flex-col bg-card border-r border-border shrink-0 w-56',
          'fixed lg:static inset-y-0 left-0 z-30',
          'transition-transform lg:transition-none duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Navegação principal"
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-[14px] border-b border-border/70 shrink-0">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl transition-transform duration-150 active:scale-95"
          >
            <SebratelLogo size={34} />
            <span className="flex flex-col leading-none">
              <span className="font-extrabold text-[15px] text-foreground tracking-tight">Sebratel</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mt-0.5">Hub</span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto" aria-label="Menu principal">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
            const count = badges[to] ?? 0
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-[10px] py-2.5 rounded-xl text-sm',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />
                    )}
                    <Icon className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 leading-none">{label}</span>
                    {count > 0 && (
                      <span className="ml-auto text-[10px] font-bold leading-none bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Admin link */}
          {user && canAccessAdminDashboard(user) && (
            <>
              <div className="my-2 mx-1 h-px bg-border" />
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-[10px] py-2.5 rounded-xl text-sm',
                    'transition-all duration-150',
                    isActive
                      ? 'bg-primary/12 font-semibold text-primary'
                      : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" aria-hidden />
                    )}
                    <ShieldCheck className="sidebar-nav-icon h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 leading-none">Administração</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-border p-2 shrink-0 flex flex-col gap-0.5">
            <Link
              to="/perfil"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-xl px-[10px] py-2 hover:bg-accent transition-colors"
              title="Editar perfil"
            >
              <div className="relative shrink-0">
                <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" />
                {isMyBirthday && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-[13px] leading-none select-none"
                    aria-label="Hoje é seu aniversário"
                  >
                    🎂
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </Link>
            {/* Status do momento */}
            <div className="relative px-[10px]" ref={statusPickerRef}>
              <button
                onClick={() => setStatusPickerOpen((o) => !o)}
                disabled={statusMutation.isPending}
                className="flex items-center gap-2 w-full rounded-lg py-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Definir status"
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full shrink-0 transition-colors',
                    user.status ? 'bg-amber-400' : 'bg-green-500',
                  )}
                  aria-hidden
                />
                <span className="truncate">{user.status ?? 'Definir status...'}</span>
              </button>

              {/* Picker dropdown (abre para cima) */}
              <AnimatePresence>
                {statusPickerOpen && (
                  <motion.div
                    className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden z-50"
                    initial={{ opacity: 0, y: 6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status do momento
                    </p>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => statusMutation.mutate(opt.value)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition-colors',
                          user.status === opt.value
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-accent text-foreground',
                        )}
                      >
                        <span className="text-base leading-none">{opt.emoji}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                    <div className="border-t border-border">
                      <button
                        onClick={() => statusMutation.mutate(null)}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <span className="text-base leading-none">○</span>
                        <span>Limpar status</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={secureSignOut}
              className="flex items-center gap-3 w-full rounded-xl px-[10px] py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Encerrar sessão"
              aria-label="Encerrar sessão"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span>Sair</span>
            </button>
          </div>
        )}
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* Topbar — mobile only */}
        <header className="h-14 bg-primary flex items-center px-4 gap-3 shrink-0 lg:hidden shadow-sm">
          <button
            className="text-black/80 hover:text-black p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-bold text-black/90 text-base tracking-tight">Sebratel Hub</span>
          {user && (
            <div className="ml-auto relative">
              <UserAvatar name={user.name || user.email} photoUrl={user.photoUrl} size="sm" />
              {isMyBirthday && (
                <span
                  className="absolute -top-1.5 -right-1.5 text-[13px] leading-none select-none"
                  aria-hidden
                >
                  🎂
                </span>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* ── Toast de aniversário de colegas ─────────────────────────────────── */}
      <AnimatePresence>
        {showBirthdayToast && (
          <motion.div
            key="birthday-toast"
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-4 z-40 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xl dark:border-amber-700 dark:bg-amber-950 max-w-xs"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Ícone */}
            <span className="text-2xl leading-none mt-0.5 shrink-0" aria-hidden>🎂</span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-snug">
                {birthdayColleagues.length === 1
                  ? `Hoje é aniversário de ${birthdayColleagues[0].name.split(' ')[0]}!`
                  : `Hoje é aniversário de ${birthdayColleagues.length} colegas!`}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 mb-2">
                {birthdayColleagues.length === 1
                  ? 'Envie uma mensagem de parabéns. 🎉'
                  : birthdayColleagues.slice(0, 2).map((c) => c.name.split(' ')[0]).join(' e ') +
                    (birthdayColleagues.length > 2 ? ` e mais ${birthdayColleagues.length - 2}.` : '. 🎉')}
              </p>
              <button
                onClick={() => {
                  setKudoTarget(birthdayColleagues[0])
                  dismissToast()
                }}
                className="text-xs font-semibold text-amber-800 dark:text-amber-200 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 transition-colors"
              >
                Enviar parabéns 🏆
              </button>
            </div>

            {/* Fechar */}
            <button
              onClick={dismissToast}
              className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
              aria-label="Fechar notificação"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kudo dialog disparado pelo toast de aniversário */}
      <SendKudoDialog
        open={kudoTarget !== null}
        onClose={() => setKudoTarget(null)}
        initialToUserId={kudoTarget?.id}
      />
    </div>
  )
}
