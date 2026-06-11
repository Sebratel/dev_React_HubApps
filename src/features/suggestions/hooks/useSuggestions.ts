import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMySuggestions, createSuggestion } from '@/services/suggestion.service'
import type { CreateSuggestionPayload } from '@/services/suggestion.service'

export function useSuggestions() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['suggestions', 'mine'],
    queryFn:  getMySuggestions,
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSuggestionPayload) => createSuggestion(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suggestions', 'mine'] })
    },
  })

  return { ...query, createMutation }
}
