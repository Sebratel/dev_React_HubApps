import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bell, MailOpen, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero, type HeroStat } from '@/components/PageHero'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useAnnouncements } from './hooks/useAnnouncements'
import { useAnnouncementFilters } from './hooks/useAnnouncementFilters'
import { AnnouncementsToolbar } from './components/AnnouncementsToolbar'
import { AnnouncementCard } from './components/AnnouncementCard'
import { AnnouncementDetailsSheet } from './components/AnnouncementDetailsSheet'
import { AnnouncementsEmptyState } from './components/AnnouncementsEmptyState'
import { AnnouncementsListSkeleton } from './components/AnnouncementsListSkeleton'
import { isImportant } from './utils'
import type { AnnouncementModel } from '@/types/models'

const PAGE_SIZE = 8

export function AnnouncementsPage() {
  const reduced = useReducedMotion()
  const { data: announcements = [], isLoading, isError, refetch } = useAnnouncements()

  const readIds = useNotificationsStore((s) => s.readAnnouncementIds)
  const markRead = useNotificationsStore((s) => s.markRead)
  const markUnread = useNotificationsStore((s) => s.markUnread)
  const markManyRead = useNotificationsStore((s) => s.markManyRead)

  const isRead = useMemo(() => {
    const set = new Set(readIds)
    return (id: string) => set.has(id)
  }, [readIds])

  const {
    q, status, category, sort,
    setQ, setStatus, setCategory, setSort,
    clearFilters, hasActiveFilters,
    filtered, availableCategories, groupByTime,
  } = useAnnouncementFilters(announcements, isRead)

  const unreadCount = useMemo(
    () => announcements.reduce((n, a) => (isRead(a.id) ? n : n + 1), 0),
    [announcements, isRead],
  )
  const importantCount = useMemo(() => announcements.filter(isImportant).length, [announcements])
  const activeFilterCount = (q.trim() ? 1 : 0) + (status !== 'all' ? 1 : 0) + (category !== 'all' ? 1 : 0)

  const heroStats: HeroStat[] = [
    { icon: Bell, value: announcements.length, label: announcements.length === 1 ? 'aviso' : 'avisos', tone: 'muted' },
    { icon: MailOpen, value: unreadCount, label: 'não lidos', tone: 'primary' },
    { icon: AlertTriangle, value: importantCount, label: 'importantes', tone: 'primary' },
  ]

  // Detail sheet
  const [selected, setSelected] = useState<AnnouncementModel | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  function openDetail(a: AnnouncementModel) {
    setSelected(a)
    setSheetOpen(true)
    if (!isRead(a.id)) markRead(a.id) // mark read on open (client-side; see store note)
  }

  function toggleRead(id: string, read: boolean) {
    if (read) markRead(id)
    else markUnread(id)
  }

  // Client-side incremental rendering (explicit "load more", not infinite scroll).
  // Server-side pagination would plug in at useAnnouncements when the API supports it.
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [q, status, category, sort])

  const visibleItems = filtered.slice(0, visible)
  const groups = groupByTime(visibleItems)
  const remaining = filtered.length - visibleItems.length

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHero
        icon={Bell}
        title="Avisos"
        subtitle="Comunicados e informações da empresa para a equipe."
        stats={announcements.length > 0 ? heroStats : undefined}
      />

      {isError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">Não foi possível carregar os avisos.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {isLoading ? (
        <AnnouncementsListSkeleton />
      ) : announcements.length === 0 ? (
        <AnnouncementsEmptyState filtered={false} />
      ) : (
        <>
          <AnnouncementsToolbar
            q={q}
            status={status}
            category={category}
            sort={sort}
            availableCategories={availableCategories}
            unreadCount={unreadCount}
            activeFilterCount={activeFilterCount}
            setQ={setQ}
            setStatus={setStatus}
            setCategory={setCategory}
            setSort={setSort}
            onMarkAllRead={() => markManyRead(announcements.map((a) => a.id))}
          />

          {filtered.length === 0 ? (
            <AnnouncementsEmptyState filtered onClearFilters={hasActiveFilters ? clearFilters : undefined} />
          ) : (
            <div className="flex flex-col gap-7">
              {groups.map((group) => (
                <section key={group.bucket} aria-label={group.label} className="flex flex-col gap-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                    <span className="ml-1.5 font-semibold text-muted-foreground/70">({group.items.length})</span>
                  </h2>
                  <div className="flex flex-col gap-3">
                    {group.items.map((a, i) => (
                      <motion.div
                        key={a.id}
                        initial={reduced ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: reduced ? 0 : Math.min(i * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
                      >
                        <AnnouncementCard announcement={a} unread={!isRead(a.id)} onOpen={() => openDetail(a)} />
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))}

              {remaining > 0 && (
                <div className="flex justify-center pt-1">
                  <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Carregar mais ({remaining})
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AnnouncementDetailsSheet
        announcement={selected}
        open={sheetOpen}
        unread={selected ? !isRead(selected.id) : false}
        onOpenChange={setSheetOpen}
        onToggleRead={toggleRead}
      />
    </div>
  )
}
