import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Newspaper, Pin, Trash2, Send, Loader2, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { UserAvatar } from '@/components/UserAvatar'
import {
  getBoardPosts, createBoardPost, deleteBoardPost, togglePinPost,
} from '@/services/board-posts.service'
import type { BoardPost } from '@/services/board-posts.service'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

// ─── Helper ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)   return 'agora'
  if (mins < 60)  return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'ontem' : `${days}d`
}

// ─── Row de post (modo compacto) ──────────────────────────────────────────────

function PostRow({
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
  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group flex gap-2.5 items-start py-2.5 px-3 rounded-xl transition-colors hover:bg-muted/50',
        post.pinned && 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-50/80 dark:hover:bg-amber-900/20'
      )}
    >
      <UserAvatar
        name={post.author.name}
        photoUrl={post.author.photoUrl}
        size="xs"
        className="shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[11px] font-semibold text-foreground truncate">
            {post.author.name.split(' ')[0]}
          </span>
          {post.pinned && (
            <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" aria-label="Fixado" />
          )}
        </div>
        <p className="text-[12px] text-foreground/80 leading-snug line-clamp-2">
          {post.message}
        </p>
      </div>

      {/* Coluna direita: timestamp + ações */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {timeAgo(post.createdAt)}
        </span>
        {(isAdmin || canDelete) && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && (
              <button
                onClick={() => onPin(post.id)}
                title={post.pinned ? 'Desafixar' : 'Fixar'}
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-amber-500 transition-colors"
              >
                <Pin className="h-3 w-3" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(post.id)}
                title="Excluir"
                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Compose inline (compacto) ────────────────────────────────────────────────

function InlineCompose({ onPost }: { onPost: (msg: string) => Promise<void> }) {
  const user = useAuthStore((s) => s.user)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [focused, setFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    try {
      await onPost(text.trim())
      setText('')
      setFocused(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-start px-1">
      <UserAvatar
        name={user?.name ?? ''}
        photoUrl={user?.photoUrl ?? null}
        size="xs"
        className="shrink-0 mt-1.5"
      />
      <div className="flex-1 flex flex-col gap-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 500))}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
            if (e.key === 'Escape') { setText(''); setFocused(false) }
          }}
          placeholder="Compartilhe algo com a equipe…"
          rows={focused ? 3 : 1}
          disabled={busy}
          className={cn(
            'w-full resize-none rounded-lg border border-border bg-muted/60 px-2.5 py-1.5 text-[12px]',
            'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30',
            'transition-all duration-150 leading-relaxed'
          )}
          aria-label="Mensagem para o mural"
        />
        <AnimatePresence>
          {focused && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex justify-end"
            >
              <button
                type="submit"
                disabled={!text.trim() || busy}
                className="flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-semibold transition-colors hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Publicar
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </form>
  )
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export function BoardWidget() {
  const user = useAuthStore((s) => s.user)
  const qc   = useQueryClient()

  const { data: allPosts = [], isLoading } = useQuery({
    queryKey:  ['board'],
    queryFn:   getBoardPosts,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled:   !!user,
  })

  // Mostra os 4 primeiros (pinned já vêm primeiro via API)
  const posts = allPosts.slice(0, 4)

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
    <section className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-primary/10">
            <Newspaper className="h-3.5 w-3.5 text-primary" aria-hidden />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Mural da Equipe</h2>
        </div>
        <Link
          to="/mural"
          className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver tudo <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Compose */}
      <div className="px-3 pb-3">
        <InlineCompose onPost={(msg) => createMutation.mutateAsync(msg).then(() => undefined)} />
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-4" />

      {/* Posts */}
      <div className="px-1 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-[11px] text-muted-foreground py-5">
            Nenhum post ainda — seja o primeiro!
          </p>
        ) : (
          <AnimatePresence mode="popLayout">
            {posts.map((post: BoardPost) => (
              <PostRow
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
      </div>
    </section>
  )
}
