import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Search, Users, ChevronDown } from 'lucide-react'
import { markDirectoryVisited } from '@/features/onboarding/OnboardingChecklist'
import { UserAvatar } from '@/components/UserAvatar'
import { getPeople } from '@/services/user.service'
import type { DirectoryPerson } from '@/services/user.service'
import { BirthdayWishesModal } from './BirthdayWishesModal'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Mapa de cores por status ─────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  '✅ Disponível':  'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  '🎯 Focado':      'bg-violet-100  text-violet-700  dark:bg-violet-950/50  dark:text-violet-300',
  '📞 Em reunião':  'bg-blue-100    text-blue-700    dark:bg-blue-950/50    dark:text-blue-300',
  '🏠 Home office': 'bg-cyan-100    text-cyan-700    dark:bg-cyan-950/50    dark:text-cyan-300',
  '☕ Em pausa':    'bg-amber-100   text-amber-700   dark:bg-amber-950/50   dark:text-amber-300',
  '🌴 De férias':   'bg-teal-100    text-teal-700    dark:bg-teal-950/50    dark:text-teal-300',
}

// ─── Conquistas computadas por pessoa ────────────────────────────────────────

interface Badge { emoji: string; label: string; short: string }

function computedBadges(p: DirectoryPerson): Badge[] {
  const badges: Badge[] = []
  if (p.birthdayToday)
    badges.push({ emoji: '🎂', label: 'Aniversário hoje',     short: 'Aniversário' })
  if (p.kudoCount >= 10)
    badges.push({ emoji: '🌟', label: '10+ kudos recebidos',  short: `${p.kudoCount} kudos` })
  else if (p.kudoCount >= 5)
    badges.push({ emoji: '⭐', label: '5+ kudos recebidos',   short: `${p.kudoCount} kudos` })
  else if (p.kudoCount >= 1)
    badges.push({ emoji: '🏆', label: '1+ kudo recebido',     short: `${p.kudoCount} kudo${p.kudoCount > 1 ? 's' : ''}` })
  const yrs = p.tenureYears ?? 0
  if (yrs >= 5)
    badges.push({ emoji: '🏅', label: `${yrs} anos de empresa`, short: `${yrs} anos` })
  else if (yrs >= 1)
    badges.push({ emoji: '🎖️', label: `${yrs} ano${yrs > 1 ? 's' : ''} de empresa`, short: `${yrs} ano${yrs > 1 ? 's' : ''}` })
  return badges
}

// ─── Card de pessoa ───────────────────────────────────────────────────────────

function PersonCard({
  person,
  onWishClick,
  onClick,
}: {
  person: DirectoryPerson
  onWishClick: (p: DirectoryPerson) => void
  onClick: (p: DirectoryPerson) => void
}) {
  const badges      = computedBadges(person)
  const statusStyle = person.status ? (STATUS_STYLE[person.status] ?? 'bg-muted text-muted-foreground') : ''

  return (
    <article
      onClick={() => onClick(person)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(person)}
      aria-label={`Ver perfil de ${person.name}`}
      className={cn(
        'group relative flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-4 py-5 text-center',
        'transition-all duration-150 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        person.birthdayToday
          ? 'border-amber-400/60 bg-gradient-to-b from-amber-50/60 to-card dark:from-amber-900/10 hover:border-amber-400'
          : 'border-border hover:border-primary/30',
      )}
    >
      {/* Avatar */}
      <div className="relative">
        <UserAvatar name={person.name} photoUrl={person.photoUrl} size="lg" />
        {/* Indicador de status no avatar */}
        {person.status && (
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-card"
            style={{ background: person.status.startsWith('✅') ? '#10b981'
                              : person.status.startsWith('🎯') ? '#8b5cf6'
                              : person.status.startsWith('📞') ? '#3b82f6'
                              : person.status.startsWith('🏠') ? '#06b6d4'
                              : person.status.startsWith('☕') ? '#f59e0b'
                              : person.status.startsWith('🌴') ? '#14b8a6'
                              : '#6b7280' }}
            aria-hidden
          />
        )}
      </div>

      {/* Nome + time */}
      <div className="min-w-0 w-full">
        <p className="font-semibold text-sm text-foreground truncate leading-tight">{person.name}</p>
        {person.teamName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{person.teamName}</p>
        )}
        {person.profile && !person.teamName && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{person.profile}</p>
        )}
      </div>

      {/* Status do momento */}
      {person.status && (
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium max-w-full',
          statusStyle,
        )}>
          {person.status}
        </span>
      )}

      {/* Conquistas */}
      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 w-full">
          {badges.map((b) => (
            <span
              key={b.label}
              title={b.label}
              aria-label={b.label}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              <span className="text-xs leading-none">{b.emoji}</span>
              <span>{b.short}</span>
            </span>
          ))}
        </div>
      )}

      {/* Ação de aniversário */}
      {person.birthdayToday && (
        <button
          onClick={(e) => { e.stopPropagation(); onWishClick(person) }}
          className="mt-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline"
        >
          🎉 Enviar parabéns
        </button>
      )}
    </article>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function DirectoryPage() {
  const user     = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  // Marca a visita para o checklist de onboarding
  useEffect(() => { markDirectoryVisited() }, [])

  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [wishTarget, setWishTarget] = useState<DirectoryPerson | null>(null)

  const { data: people = [], isLoading } = useQuery({
    queryKey: ['users', 'people'],
    queryFn:  getPeople,
    staleTime: 2 * 60_000,
    enabled:  !!user,
  })

  // Lista de times únicos para o filtro
  const teams = useMemo(() => {
    const set = new Set<string>()
    people.forEach((p) => { if (p.teamName) set.add(p.teamName) })
    return Array.from(set).sort()
  }, [people])

  // Filtragem
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return people.filter((p) => {
      if (teamFilter !== 'all' && p.teamName !== teamFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !(p.teamName ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [people, search, teamFilter])

  // Separa aniversariantes de hoje
  const todayBirthdays = filtered.filter((p) => p.birthdayToday)
  const rest           = filtered.filter((p) => !p.birthdayToday)

  return (
    <main className="min-h-full pb-12">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-foreground">Pessoas</h1>
          {!isLoading && (
            <span className="ml-1 text-sm text-muted-foreground">
              · {people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground pl-10">
          Conheça sua equipe, veja quem está online e celebre com os aniversariantes de hoje.
        </p>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou time…"
            className={cn(
              'w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'
            )}
            aria-label="Buscar pessoa"
          />
        </div>

        {/* Filtro por time */}
        {teams.length > 0 && (
          <div className="relative">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className={cn(
                'appearance-none w-full sm:w-44 rounded-xl border border-border bg-card pl-3 pr-8 py-2 text-sm',
                'text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors cursor-pointer'
              )}
              aria-label="Filtrar por time"
            >
              <option value="all">Todos os times</option>
              {teams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" aria-hidden />
          </div>
        )}
      </div>

      {/* ── Estado de carregamento ── */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* ── Aniversariantes de hoje ── */}
      {!isLoading && todayBirthdays.length > 0 && (
        <section className="mb-6" aria-label="Aniversariantes de hoje">
          <h2 className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
            <span aria-hidden>🎂</span> Aniversariantes de hoje
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {todayBirthdays.map((p) => (
              <PersonCard
                key={p.id} person={p} onWishClick={setWishTarget}
                onClick={(person) => navigate(`/pessoas/${person.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Todos ── */}
      {!isLoading && rest.length > 0 && (
        <section aria-label="Todas as pessoas">
          {todayBirthdays.length > 0 && (
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">Todos</h2>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rest.map((p) => (
              <PersonCard
                key={p.id} person={p} onWishClick={setWishTarget}
                onClick={(person) => navigate(`/pessoas/${person.id}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Vazio ── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <span className="text-4xl" aria-hidden>🔍</span>
          <p className="text-sm font-medium text-foreground">Nenhuma pessoa encontrada</p>
          <p className="text-xs text-muted-foreground">
            Tente outro nome ou remova o filtro de time.
          </p>
        </div>
      )}

      {/* ── Modal de parabéns ── */}
      <AnimatePresence>
        {wishTarget && (
          <BirthdayWishesModal
            celebrant={wishTarget}
            onClose={() => setWishTarget(null)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
