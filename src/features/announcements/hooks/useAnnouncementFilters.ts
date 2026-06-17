import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { AnnouncementModel } from '@/types/models'
import type { AnnouncementType } from '@/types/enums'
import { timeBucket, type TimeBucket, TIME_BUCKET_LABELS } from '../utils'

export type StatusFilter = 'all' | 'unread' | 'read'
export type CategoryFilter = 'all' | AnnouncementType
export type SortOrder = 'recent' | 'old'

const STATUS_VALUES: StatusFilter[] = ['all', 'unread', 'read']
const SORT_VALUES: SortOrder[] = ['recent', 'old']

export interface AnnouncementGroup {
  bucket: TimeBucket
  label: string
  items: AnnouncementModel[]
}

interface UseAnnouncementFiltersResult {
  q: string
  status: StatusFilter
  category: CategoryFilter
  sort: SortOrder
  setQ: (v: string) => void
  setStatus: (v: StatusFilter) => void
  setCategory: (v: CategoryFilter) => void
  setSort: (v: SortOrder) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  /** Sorted + filtered flat list. */
  filtered: AnnouncementModel[]
  /** Categories actually present in the dataset (for building the category filter). */
  availableCategories: AnnouncementType[]
  /** Buckets a (possibly paginated) subset by time, preserving sort order. */
  groupByTime: (items: AnnouncementModel[]) => AnnouncementGroup[]
}

const BUCKET_ORDER: TimeBucket[] = ['today', 'week', 'older']

export function useAnnouncementFilters(
  announcements: AnnouncementModel[],
  isRead: (id: string) => boolean,
): UseAnnouncementFiltersResult {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const status = (STATUS_VALUES.includes(params.get('status') as StatusFilter)
    ? (params.get('status') as StatusFilter)
    : 'all')
  const sort = (SORT_VALUES.includes(params.get('sort') as SortOrder)
    ? (params.get('sort') as SortOrder)
    : 'recent')
  const category = (params.get('category') ?? 'all') as CategoryFilter

  const patchParam = useCallback(
    (key: string, value: string, fallback: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === fallback || value === '') next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const setQ = useCallback((v: string) => patchParam('q', v, ''), [patchParam])
  const setStatus = useCallback((v: StatusFilter) => patchParam('status', v, 'all'), [patchParam])
  const setCategory = useCallback((v: CategoryFilter) => patchParam('category', v, 'all'), [patchParam])
  const setSort = useCallback((v: SortOrder) => patchParam('sort', v, 'recent'), [patchParam])

  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        next.delete('status')
        next.delete('category')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const availableCategories = useMemo(() => {
    const present = new Set<AnnouncementType>()
    announcements.forEach((a) => present.add(a.type))
    return Array.from(present)
  }, [announcements])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const result = announcements.filter((a) => {
      if (status === 'unread' && isRead(a.id)) return false
      if (status === 'read' && !isRead(a.id)) return false
      if (category !== 'all' && a.type !== category) return false
      if (term) {
        const haystack = `${a.title} ${a.body ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
    result.sort((a, b) =>
      sort === 'recent'
        ? b.createdAt.getTime() - a.createdAt.getTime()
        : a.createdAt.getTime() - b.createdAt.getTime(),
    )
    return result
  }, [announcements, q, status, category, sort, isRead])

  const groupByTime = useCallback(
    (items: AnnouncementModel[]): AnnouncementGroup[] => {
      const map = new Map<TimeBucket, AnnouncementModel[]>()
      items.forEach((a) => {
        const bucket = timeBucket(a.createdAt)
        const arr = map.get(bucket) ?? []
        arr.push(a)
        map.set(bucket, arr)
      })
      const order = sort === 'recent' ? BUCKET_ORDER : [...BUCKET_ORDER].reverse()
      return order
        .map((bucket) => ({ bucket, label: TIME_BUCKET_LABELS[bucket], items: map.get(bucket) ?? [] }))
        .filter((group) => group.items.length > 0)
    },
    [sort],
  )

  const hasActiveFilters = q.trim() !== '' || status !== 'all' || category !== 'all'

  return {
    q, status, category, sort,
    setQ, setStatus, setCategory, setSort,
    clearFilters, hasActiveFilters,
    filtered, availableCategories, groupByTime,
  }
}
