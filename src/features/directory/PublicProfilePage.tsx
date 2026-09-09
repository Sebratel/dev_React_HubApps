import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, MessageCircle, Loader2 } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { getPublicProfile } from '@/services/user.service'
import { getUserKudos } from '@/services/kudos.service'
import { BirthdayWishesModal } from './BirthdayWishesModal'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import type { KudoModel } from '@/types/models'

// ─── Badge computados (mesma lógica do DirectoryPage) ────────────────────────

function computedBadges(p: {
  birthdayToday: boolean
  kudoCount: number
  tenureYears: number | null
}) {
  const badges: { emoji: string; label: string }[] = []
  if (p.birthdayToday)         badges.push({ emoji: '🎂', label: 'Aniversário hoje!' })
  if (p.kudoCount >= 10)       badges.push({ emoji: '🌟', label: '10+ kudos recebidos' })
  else if (p.kudoCount >= 5)   badges.push({ emoji: '⭐', label: '5+ kudos recebidos' })
  else if (p.kudoCount >= 1)   badges.push({ emoji: '🏆', label: 'Primeiro kudo recebido' })
  if ((p.tenureYears ?? 0) >= 5)  badges.push({ emoji: '🏅', label: `${p.tenureYears} anos de empresa` })
  else if ((p.tenureYears ?? 0) >= 1) badges.push({ emoji: '🎖️', label: `${p.tenureYears} ano${(p.tenureYears ?? 0) > 1 ? 's' : ''} de empresa` })
  return badges
}

// ─── Kudo card ────────────────────────────────────────────────────────────────

function KudoCard({ kudo }: { kudo: KudoModel }) {
  return (
    <div className="flex gap-3 px-4 py-3 rounded-xl border border-border bg-muted/30">
      {kudo.isAnonymous ? (
        <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">?</div>
      ) : (
        <UserAvatar name={kudo.fromName ?? ''} photoUrl={kudo.fromPhoto ?? null} size="xs" className="shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {kudo.isAnonymous ? 'Anônimo' : kudo.fromName}
        </p>
        <p className="text-sm text-foreground/80 leading-snug mt-0.5">{kudo.message}</p>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function PublicProfilePage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [showWishes, setShowWishes] = useState(false)

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['users', 'public', id],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn:  () => getPublicProfile(id!),
    enabled:  !!id,
    staleTime: 2 * 60_000,
  })

  const { data: kudos = [] } = useQuery({
    queryKey: ['kudos', 'user', id],
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    queryFn:  () => getUserKudos(id!),
    enabled:  !!id && !!profile,
    staleTime: 2 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="text-4xl" aria-hidden>😕</span>
        <p className="text-sm font-medium text-foreground">Usuário não encontrado</p>
        <button onClick={() => navigate('/pessoas')} className="text-xs text-primary hover:underline">
          ← Voltar ao Diretório
        </button>
      </div>
    )
  }

  const badges    = computedBadges(profile)
  const firstName = profile.name.split(' ')[0]

  const isMyProfile = currentUser?.id === id

  return (
    <main className="pb-12">
      {/* Back */}
      <button
        onClick={() => navigate('/pessoas')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Diretório de Pessoas
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
        {/* ── Card principal ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'rounded-2xl border bg-card p-6 flex flex-col items-center gap-4 text-center w-full lg:w-72 self-start',
            profile.birthdayToday
              ? 'border-amber-400/60 bg-gradient-to-b from-amber-50/60 to-card dark:from-amber-900/10'
              : 'border-border'
          )}
        >
          {/* Avatar */}
          <div className="relative">
            <UserAvatar name={profile.name} photoUrl={profile.photoUrl} size="xl" />
            {profile.status && (
              <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-card" aria-hidden />
            )}
          </div>

          {/* Identity */}
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{profile.name}</h1>
            {profile.teamName && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.teamName}</p>
            )}
            {profile.profile && (
              <p className="text-xs text-muted-foreground">{profile.profile}</p>
            )}
          </div>

          {/* Status */}
          {profile.status && (
            <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {profile.status}
            </span>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {badges.map((b) => (
                <span
                  key={b.label}
                  title={b.label}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  <span aria-hidden>{b.emoji}</span> {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 text-center pt-1 border-t border-border w-full justify-center">
            <div>
              <p className="text-xl font-bold text-foreground tabular-nums">{profile.kudoCount}</p>
              <p className="text-[10px] text-muted-foreground">kudo{profile.kudoCount !== 1 ? 's' : ''}</p>
            </div>
            {(profile.tenureYears ?? 0) > 0 && (
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{profile.tenureYears}</p>
                <p className="text-[10px] text-muted-foreground">ano{(profile.tenureYears ?? 0) !== 1 ? 's' : ''} empresa</p>
              </div>
            )}
          </div>

          {/* Ações */}
          {!isMyProfile && profile.birthdayToday && (
            <button
              onClick={() => setShowWishes(true)}
              className="w-full rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium py-2.5 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
            >
              🎂 Enviar parabéns
            </button>
          )}
        </motion.div>

        {/* ── Kudos recebidos ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <MessageCircle className="h-4 w-4 text-primary shrink-0" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">
                Kudos recebidos {isMyProfile ? 'por mim' : `por ${firstName}`}
              </h2>
            </div>

            <div className="p-4 flex flex-col gap-3 min-h-[160px]">
              {kudos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <span className="text-3xl" aria-hidden>💌</span>
                  <p className="text-sm font-medium text-foreground">Nenhum kudo ainda</p>
                  <p className="text-xs text-muted-foreground">
                    {isMyProfile ? 'Peça para um colega te reconhecer!' : `Envie um kudo para ${firstName}!`}
                  </p>
                </div>
              ) : (
                kudos.map((k) => <KudoCard key={k.id} kudo={k} />)
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de parabéns */}
      <AnimatePresence>
        {showWishes && profile.birthdayToday && (
          <BirthdayWishesModal
            celebrant={{ id: profile.id, name: profile.name, photoUrl: profile.photoUrl }}
            onClose={() => setShowWishes(false)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
