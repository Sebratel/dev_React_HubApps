import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminGetAllSuggestions,
  adminUpdateSuggestionStatus,
} from '@/services/suggestion.service'
import type { SuggestionStatus } from '@/types/enums'

export function useAdminSuggestions() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['suggestions', 'admin'],
    queryFn:  adminGetAllSuggestions,
    staleTime: 30_000,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id, status, adminNote,
    }: { id: string; status: SuggestionStatus; adminNote?: string | null }) =>
      adminUpdateSuggestionStatus(id, status, adminNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions'] })
    },
  })

  return { ...query, updateStatusMutation }
}
