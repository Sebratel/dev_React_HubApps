import { useMemo, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listAuditLogs, type ListAuditLogsParams } from '@/services/admin/admin-audit-log.service'
import type { AuditAction } from '@/types/api'

export const PAGE_SIZE = 50

export interface AuditLogFilters {
  search: string
  action: AuditAction | 'all'
  period: 'all' | 'today' | 'last7days' | 'last30days'
  page: number
}

const DEFAULT_FILTERS: AuditLogFilters = {
  search: '',
  action: 'all',
  period: 'all',
  page: 1,
}

function periodToDates(period: AuditLogFilters['period']): {
  dateFrom?: string
  dateTo?: string
} {
  if (period === 'all') return {}
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  if (period === 'today') {
    const iso = toISO(today)
    return { dateFrom: iso, dateTo: iso }
  }
  const days = period === 'last7days' ? 6 : 29
  const from = new Date(today)
  from.setDate(from.getDate() - days)
  return { dateFrom: toISO(from), dateTo: toISO(today) }
}

export function useAuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>(DEFAULT_FILTERS)

  const serverParams = useMemo((): ListAuditLogsParams => {
    const { dateFrom, dateTo } = periodToDates(filters.period)
    const params: ListAuditLogsParams = {
      limit: PAGE_SIZE,
      offset: (filters.page - 1) * PAGE_SIZE,
    }
    if (filters.action !== 'all') params.action = filters.action as AuditAction
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [filters.action, filters.period, filters.page])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', serverParams],
    queryFn: () => listAuditLogs(serverParams),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const allLogs = useMemo(() => data?.data ?? [], [data])

  // Client-side text search over the current page (userName and details)
  const filteredLogs = useMemo(() => {
    if (!filters.search) return allLogs
    const q = filters.search.toLowerCase()
    return allLogs.filter(
      (log) => log.userName.toLowerCase().includes(q) || log.details.toLowerCase().includes(q)
    )
  }, [allLogs, filters.search])

  const totalLogs = data?.pagination.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE))
  const hasFilters = filters.search !== '' || filters.action !== 'all' || filters.period !== 'all'

  return {
    logs: filteredLogs,
    totalLogs,
    totalPages,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
  }
}
