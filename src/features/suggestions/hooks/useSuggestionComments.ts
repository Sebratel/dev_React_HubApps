import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSuggestionComments, addSuggestionComment,
  type SuggestionModel,
} from '@/services/suggestion.service'

const FEED_KEY = ['suggestions', 'feed'] as const

/**
 * Comments for a single suggestion. The list query is lazy (only enabled while
 * the comments panel is open) to avoid loading every thread up front.
 */
export function useSuggestionComments(suggestionId: string, enabled: boolean) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['suggestions', suggestionId, 'comments'],
    queryFn: () => getSuggestionComments(suggestionId),
    enabled,
    staleTime: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: (body: string) => addSuggestionComment(suggestionId, body),
    onSuccess: (comment) => {
      qc.setQueryData(['suggestions', suggestionId, 'comments'], (old: unknown) =>
        Array.isArray(old) ? [...old, comment] : [comment],
      )
      // Keep the feed's comment counter in sync.
      qc.setQueryData<SuggestionModel[]>(FEED_KEY, (old) =>
        old?.map((s) => (s.id === suggestionId ? { ...s, commentCount: s.commentCount + 1 } : s)),
      )
    },
  })

  return { ...query, addMutation }
}
