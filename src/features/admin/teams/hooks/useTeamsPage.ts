import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adminGetAllTeams,
  adminCreateTeam,
  adminUpdateTeam,
  adminDeleteTeam,
  type TeamPayload,
} from '@/services/team.service'

export function useTeamsPage() {
  const queryClient = useQueryClient()

  const { data: teams = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'teams'],
    queryFn:  adminGetAllTeams,
    staleTime: 30_000,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] })
    void queryClient.invalidateQueries({ queryKey: ['teams'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: TeamPayload) => adminCreateTeam(payload),
    onSuccess:  invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TeamPayload> & { is_active?: 0 | 1 } }) =>
      adminUpdateTeam(id, payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: adminDeleteTeam,
    onSuccess:  invalidate,
  })

  return { teams, isLoading, isError, refetch, createMutation, updateMutation, deleteMutation }
}
