import { useQuery } from '@tanstack/react-query'
import { listUsers } from '@/services/admin/admin-user.service'
import { listAllApps } from '@/services/admin/admin-app.service'
import { listAllAccessRequests } from '@/services/admin/admin-access-request.service'
import { listAuditLogs } from '@/services/admin/admin-audit-log.service'
import { getAdminStats } from '@/services/admin/admin-stats.service'

export function useAdminDashboard() {
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', 'list'],
    queryFn: () => listUsers({ limit: 500 }),
    staleTime: 60_000,
  })

  const appsQuery = useQuery({
    queryKey: ['admin', 'apps', 'list'],
    queryFn: listAllApps,
    staleTime: 60_000,
  })

  const pendingQuery = useQuery({
    queryKey: ['admin', 'access-requests', { status: 'pending' }],
    queryFn: () => listAllAccessRequests({ status: 'pending', limit: 50 }),
    staleTime: 30_000,
  })

  const logsQuery = useQuery({
    queryKey: ['admin', 'audit-logs', 'recent'],
    queryFn: () => listAuditLogs({ limit: 10 }),
    staleTime: 30_000,
  })

  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn:  getAdminStats,
    staleTime: 60_000,
  })

  const users = usersQuery.data?.data ?? []
  const apps  = appsQuery.data ?? []

  const metrics = {
    totalUsers:        usersQuery.data?.pagination.total ?? 0,
    activeUsers:       users.filter((u) => u.isActive).length,
    inactiveUsers:     users.filter((u) => !u.isActive).length,
    adminUsers:        users.filter((u) => u.isAdmin).length,
    activeApps:        apps.filter((a) => a.status === 'active').length,
    inactiveApps:      apps.filter((a) => a.status !== 'active').length,
    pendingRequests:   pendingQuery.data?.pagination.total ?? 0,
    pendingSuggestions: statsQuery.data?.pendingSuggestions ?? 0,
    activeTeams:       statsQuery.data?.teams.active ?? 0,
    activeAnnouncements: statsQuery.data?.announcements.active ?? 0,
  }

  const isLoading =
    usersQuery.isLoading || appsQuery.isLoading ||
    pendingQuery.isLoading || logsQuery.isLoading || statsQuery.isLoading

  const hasError =
    usersQuery.isError || appsQuery.isError ||
    pendingQuery.isError || logsQuery.isError || statsQuery.isError

  function refetchAll() {
    void usersQuery.refetch()
    void appsQuery.refetch()
    void pendingQuery.refetch()
    void logsQuery.refetch()
    void statsQuery.refetch()
  }

  return {
    metrics,
    stats:           statsQuery.data ?? null,
    pendingRequests: pendingQuery.data?.data ?? [],
    recentAuditLogs: logsQuery.data?.data ?? [],
    isLoading,
    hasError,
    refetchAll,
  }
}
