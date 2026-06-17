import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSuggestions, createSuggestion, voteSuggestion,
  type CreateSuggestionPayload, type SuggestionModel, type VoteValue,
} from '@/services/suggestion.service'

const FEED_KEY = ['suggestions', 'feed'] as const

/** Recompute tallies for an optimistic vote change (old myVote → new value). */
function applyVote(s: SuggestionModel, value: VoteValue): SuggestionModel {
  let { upCount, downCount, score } = s
  if (s.myVote === 1) { upCount--; score-- }
  if (s.myVote === -1) { downCount--; score++ }
  if (value === 1) { upCount++; score++ }
  if (value === -1) { downCount++; score-- }
  return { ...s, upCount, downCount, score, myVote: value === 0 ? null : value }
}

export function useSuggestions() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: FEED_KEY,
    queryFn:  getSuggestions,
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSuggestionPayload) => createSuggestion(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FEED_KEY })
    },
  })

  const voteMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: VoteValue }) => voteSuggestion(id, value),
    // Optimistic update with safe rollback on error.
    onMutate: async ({ id, value }) => {
      await qc.cancelQueries({ queryKey: FEED_KEY })
      const previous = qc.getQueryData<SuggestionModel[]>(FEED_KEY)
      qc.setQueryData<SuggestionModel[]>(FEED_KEY, (old) =>
        old?.map((s) => (s.id === id ? applyVote(s, value) : s)),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(FEED_KEY, ctx.previous)
    },
    onSuccess: (updated) => {
      qc.setQueryData<SuggestionModel[]>(FEED_KEY, (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s)),
      )
    },
  })

  return { ...query, createMutation, voteMutation }
}
