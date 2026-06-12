import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approveRequest,
  listAllAccessRequests,
  rejectRequest,
} from '@/services/admin/admin-access-request.service'

export interface BulkResult { success: number; failed: number }

export interface AccessRequestFilters {
  search: string
  status: 'all' | 'pending' | 'approved' | 'rejected'
}

const DEFAULT_FILTERS: AccessRequestFilters = {
  search: '',
  status: 'all',
}

export function useAccessRequestsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AccessRequestFilters>(DEFAULT_FILTERS)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'access-requests', 'list'],
    queryFn: () => listAllAccessRequests({ limit: 200 }),
    staleTime: 30_000,
  })

  const allRequests = useMemo(() => data?.data ?? [], [data])

  const filteredRequests = useMemo(() => {
    return allRequests.filter((req) => {
      if (filters.status !== 'all' && req.status !== filters.status) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (
          !req.appName.toLowerCase().includes(q) &&
          !req.userName.toLowerCase().includes(q) &&
          !req.email.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [allRequests, filters])

  function invalidateRequests() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'access-requests'] })
  }

  const approveMutation = useMutation({
    mutationFn: approveRequest,
    onSuccess: invalidateRequests,
  })

  const rejectMutation = useMutation({
    mutationFn: rejectRequest,
    onSuccess: invalidateRequests,
  })

  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  async function bulkApprove(ids: string[]): Promise<BulkResult> {
    setIsBulkProcessing(true)
    let success = 0, failed = 0
    await Promise.allSettled(
      ids.map((id) => approveRequest(id).then(() => { success++ }).catch(() => { failed++ }))
    )
    setIsBulkProcessing(false)
    invalidateRequests()
    return { success, failed }
  }

  async function bulkReject(ids: string[]): Promise<BulkResult> {
    setIsBulkProcessing(true)
    let success = 0, failed = 0
    await Promise.allSettled(
      ids.map((id) => rejectRequest(id).then(() => { success++ }).catch(() => { failed++ }))
    )
    setIsBulkProcessing(false)
    invalidateRequests()
    return { success, failed }
  }

  const hasFilters = filters.search !== '' || filters.status !== 'all'

  return {
    requests: filteredRequests,
    totalRequests: data?.pagination.total ?? 0,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    hasFilters,
    approveMutation,
    rejectMutation,
    isBulkProcessing,
    bulkApprove,
    bulkReject,
  }
}
