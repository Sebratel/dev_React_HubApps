import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { SuggestionModel } from '@/services/suggestion.service'
import type { SuggestionType, SuggestionStatus } from '@/types/enums'
import { timeBucket, TIME_BUCKET_LABELS, type TimeBucket } from '@/lib/datetime'

export type TypeFilter = 'all' | SuggestionType
export type StatusFilter = 'all' | SuggestionStatus
export type SortOrder = 'recent' | 'old'

const SORT_VALUES: SortOrder[] = ['recent', 'old']
const BUCKET_ORDER: TimeBucket[] = ['today', 'week', 'older']

export interface SuggestionGroup {
  bucket: TimeBucket
  label: string
  items: SuggestionModel[]
}

interface UseSuggestionFiltersResult {
  q: string
  type: TypeFilter
  status: StatusFilter
  sort: SortOrder
  setQ: (v: string) => void
  setType: (v: TypeFilter) => void
  setStatus: (v: StatusFilter) => void
  setSort: (v: SortOrder) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  filtered: SuggestionModel[]
  availableTypes: SuggestionType[]
  availableStatuses: SuggestionStatus[]
  groupByTime: (items: SuggestionModel[]) => SuggestionGroup[]
}

export function useSuggestionFilters(suggestions: SuggestionModel[]): UseSuggestionFiltersResult {
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? 'all') as TypeFilter
  const status = (params.get('status') ?? 'all') as StatusFilter
  const sort = (SORT_VALUES.includes(params.get('sort') as SortOrder)
    ? (params.get('sort') as SortOrder)
    : 'recent')

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
  const setType = useCallback((v: TypeFilter) => patchParam('type', v, 'all'), [patchParam])
  const setStatus = useCallback((v: StatusFilter) => patchParam('status', v, 'all'), [patchParam])
  const setSort = useCallback((v: SortOrder) => patchParam('sort', v, 'recent'), [patchParam])

  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('q')
        next.delete('type')
        next.delete('status')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const availableTypes = useMemo(() => {
    const present = new Set<SuggestionType>()
    suggestions.forEach((s) => present.add(s.type))
    return Array.from(present)
  }, [suggestions])

  const availableStatuses = useMemo(() => {
    const present = new Set<SuggestionStatus>()
    suggestions.forEach((s) => present.add(s.status))
    return Array.from(present)
  }, [suggestions])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const result = suggestions.filter((s) => {
      if (type !== 'all' && s.type !== type) return false
      if (status !== 'all' && s.status !== status) return false
      if (term) {
        const haystack = `${s.title} ${s.body ?? ''} ${s.appName ?? ''} ${s.sector ?? ''}`.toLowerCase()
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
  }, [suggestions, q, type, status, sort])

  const groupByTime = useCallback(
    (items: SuggestionModel[]): SuggestionGroup[] => {
      const map = new Map<TimeBucket, SuggestionModel[]>()
      items.forEach((s) => {
        const bucket = timeBucket(s.createdAt)
        const arr = map.get(bucket) ?? []
        arr.push(s)
        map.set(bucket, arr)
      })
      const order = sort === 'recent' ? BUCKET_ORDER : [...BUCKET_ORDER].reverse()
      return order
        .map((bucket) => ({ bucket, label: TIME_BUCKET_LABELS[bucket], items: map.get(bucket) ?? [] }))
        .filter((group) => group.items.length > 0)
    },
    [sort],
  )

  const activeFilterCount = (q.trim() ? 1 : 0) + (type !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  return {
    q, type, status, sort,
    setQ, setType, setStatus, setSort,
    clearFilters, hasActiveFilters, activeFilterCount,
    filtered, availableTypes, availableStatuses, groupByTime,
  }
}
