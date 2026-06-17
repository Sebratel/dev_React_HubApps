import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { UserAvatar } from '@/components/UserAvatar'
import { relativeTime } from '@/lib/datetime'
import { useSuggestionComments } from '../hooks/useSuggestionComments'

interface SuggestionCommentsProps {
  suggestionId: string
  open: boolean
}

export function SuggestionComments({ suggestionId, open }: SuggestionCommentsProps) {
  const { data: comments = [], isLoading, isError, addMutation } = useSuggestionComments(suggestionId, open)
  const [draft, setDraft] = useState('')

  if (!open) return null

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || addMutation.isPending) return
    addMutation.mutate(body, { onSuccess: () => setDraft('') })
  }

  return (
    <div className="mt-4 border-t border-border/60 pt-4">
      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva um comentário..."
          aria-label="Novo comentário"
          className="min-h-[64px]"
          maxLength={2000}
        />
        <div className="flex items-center justify-between">
          {addMutation.isError && (
            <span className="text-xs text-destructive">Não foi possível enviar. Tente novamente.</span>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim() || addMutation.isPending}
            className="ml-auto gap-1.5"
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {addMutation.isPending ? 'Enviando...' : 'Comentar'}
          </Button>
        </div>
      </form>

      {/* List */}
      <div className="mt-4 flex flex-col gap-4">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando comentários...</p>
        ) : isError ? (
          <p className="text-xs text-destructive">Erro ao carregar comentários.</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Seja o primeiro a comentar.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <UserAvatar name={c.userName} size="sm" className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-semibold text-foreground">{c.userName}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(c.createdAt)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
