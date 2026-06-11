import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  activateUser,
  deactivateUser,
  listUsers,
  promoteToAdmin,
  revokeAdmin,
  updateUserProfile,
} from '@/services/admin/admin-user.service'
import type { UserModel } from '@/types/models'

export interface UserFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
  role: 'all' | 'admin' | 'user'
  profile: string
}

const DEFAULT_FILTERS: UserFilters = {
  search: '',
  status: 'all',
  role: 'all',
  profile: '',
}

export function useUsersPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<UserFilters>(DEFAULT_FILTERS)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'users', 'list'],
    queryFn: () => listUsers({ limit: 500 }),
    staleTime: 60_000,
  })

  const allUsers = useMemo(() => data?.data ?? [], [data])

  const filteredUsers = useMemo(() => {
    return allUsers.filter((user) => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) {
          return false
        }
      }
      if (filters.status === 'active' && !user.isActive) return false
      if (filters.status === 'inactive' && user.isActive) return false
      if (filters.role === 'admin' && !user.isAdmin) return false
      if (filters.role === 'user' && user.isAdmin) return false
      if (filters.profile && user.profile !== filters.profile) return false
      return true
    })
  }, [allUsers, filters])

  // Distinct profiles for the filter dropdown
  const availableProfiles = useMemo(
    () => [...new Set(allUsers.map((u) => u.profile).filter(Boolean))].sort(),
    [allUsers]
  )

  function invalidateUsers() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
  }

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: invalidateUsers,
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateUser,
    onSuccess: invalidateUsers,
  })

  const promoteAdminMutation = useMutation({
    mutationFn: promoteToAdmin,
    onSuccess: invalidateUsers,
  })

  const revokeAdminMutation = useMutation({
    mutationFn: revokeAdmin,
    onSuccess: invalidateUsers,
  })

  const updateProfileMutation = useMutation({
    mutationFn: ({
      userId,
      patch,
    }: {
      userId: string
      patch: Partial<Pick<UserModel, 'profile' | 'team'>>
    }) => updateUserProfile(userId, patch),
    onSuccess: invalidateUsers,
  })

  return {
    users: filteredUsers,
    totalUsers: data?.pagination.total ?? 0,
    isLoading,
    isError,
    refetch,
    filters,
    setFilters,
    availableProfiles,
    activateMutation,
    deactivateMutation,
    promoteAdminMutation,
    revokeAdminMutation,
    updateProfileMutation,
  }
}
