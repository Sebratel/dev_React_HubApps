import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, Trash2, Send, Loader2, Newspaper } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import {
  getBoardPosts, createBoardPost, deleteBoardPost, togglePinPost,
} from '@/services/board-posts.service'
import type { BoardPost } from '@/services/board-posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return 'agora'
  if (mins < 60)  return `${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  if (days < 7)   return `${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Card de post ─────────────────────────────────────────────────────────────

function PostCard({
  post,
  canDelete,
  isAdmin,
  onDelete,
  onPin,
}: {
  post: BoardPost
  canDelete: boolean
  isAdmin: boolean
  onDelete: (id: string) => void
  onPin: (id: string) => void
}) {
  const hasActions = isAdmin || canDelete

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'group flex gap-3 rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm',
        post.pinned
          ? 'border-amber-400/50 bg-gradient-to-br from-amber-50/40 to-card dark:from-amber-900/10'
          : 'border-border'
      )}
    >
      {/* Avatar */}
      <UserAvatar
        name={post.author.name}
        photoUrl={post.author.photoUrl}
        size="sm"
        className="shrink-0 mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground leading-tight truncate">
            {post.author.name.split(' ').slice(0, 2).join(' ')}
          </span>
          {post.pinned && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 rounded-full px-1.5 py-0.5 shrink-0">
              <Pin className="h-2.5 w-2.5" aria-hidden /> Fixado
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
          {post.message}
        </p>
      </div>

      {/* Coluna direita: timestamp + ações */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {timeAgo(post.createdAt)}
        </span>
        {hasActions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && (
              <button
                onClick={() => onPin(post.id)}
                title={post.pinned ? 'Desafixar' : 'Fixar post'}
                className={cn(
                  'h-6 w-6 rounded-md flex items-center justify-center transition-colors',
                  post.pinned
                    ? 'text-amber-500 hover:text-amber-700 bg-amber-100 dark:bg-amber-900/30'
                    : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                )}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(post.id)}
                title="Excluir post"
                className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}

// ─── Compose box ──────────────────────────────────────────────────────────────

function ComposeBox({ onPost }: { onPost: (msg: string) => void }) {
  const user = useAuthStore((s) => s.user)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await onPost(text.trim())
      setText('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 flex gap-3">
      <UserAvatar
        name={user?.name ?? ''}
        photoUrl={user?.photoUrl ?? null}
        size="sm"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 flex flex-col gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
          }}
          placeholder="Compartilhe algo com a equipe…"
          rows={2}
          disabled={busy}
          className={cn(
            'w-full resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30',
            'transition-colors overflow-hidden leading-relaxed'
          )}
          aria-label="Mensagem para o mural"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {text.length}/500 · Enter+Ctrl para postar
          </span>
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className={cn(
              'flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground',
              'px-3 py-1.5 text-xs font-semibold transition-colors',
              'hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publicar
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export function BoardPage() {
  const user    = useAuthStore((s) => s.user)
  const qc      = useQueryClient()

  const { data: posts = [], isLoading } = useQuery({
    queryKey:  ['board'],
    queryFn:   getBoardPosts,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled:   !!user,
  })

  const createMutation = useMutation({
    mutationFn: createBoardPost,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBoardPost,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  })

  const pinMutation = useMutation({
    mutationFn: togglePinPost,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['board'] }),
  })

  return (
    <main className="pb-12 flex flex-col gap-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Newspaper className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <h1 className="text-xl font-bold text-foreground">Mural da Equipe</h1>
        </div>
        <p className="text-sm text-muted-foreground pl-10">
          Compartilhe recados, novidades e conquistas com toda a equipe.
        </p>
      </div>

      {/* Compose */}
      <ComposeBox onPost={(msg) => createMutation.mutateAsync(msg)} />

      {createMutation.isError && (
        <p className="text-xs text-red-500 text-center -mt-2">
          {(createMutation.error as Error)?.message || 'Erro ao publicar'}
        </p>
      )}

      {/* Feed */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-4xl" aria-hidden>📋</span>
          <p className="text-sm font-medium text-foreground">Nenhum post ainda</p>
          <p className="text-xs text-muted-foreground">Seja o primeiro a compartilhar algo com a equipe!</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              canDelete={post.author.id === user?.id || !!user?.isAdmin}
              isAdmin={!!user?.isAdmin}
              onDelete={(id) => deleteMutation.mutate(id)}
              onPin={(id) => pinMutation.mutate(id)}
            />
          ))}
        </AnimatePresence>
      )}
    </main>
  )
}
