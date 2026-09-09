import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { createPoll } from '@/services/polls.service'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function CreatePollModal({ onClose, onCreated }: Props) {
  const [question, setQuestion] = useState('')
  const [options, setOptions]   = useState(['', ''])

  const mutation = useMutation({
    mutationFn: () => createPoll({
      question: question.trim(),
      options: options.map((o) => o.trim()).filter(Boolean),
    }),
    onSuccess: onCreated,
  })

  const addOption = () => {
    if (options.length < 4) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const setOption = (i: number, val: string) => {
    const next = [...options]
    next[i] = val
    setOptions(next)
  }

  const isValid = question.trim().length >= 3 &&
    options.filter((o) => o.trim()).length >= 2

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative z-10 w-full max-w-md mx-4 mb-4 sm:mb-0 bg-card rounded-2xl border border-border shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Criar enquete"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <span className="text-base leading-none" aria-hidden>📊</span>
          </div>
          <h2 className="text-sm font-semibold text-foreground flex-1">Nova Enquete</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 flex flex-col gap-4">
          {/* Pergunta */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pergunta
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
              placeholder="O que você quer saber da equipe?"
              rows={2}
              className={cn(
                'w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm resize-none',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'
              )}
            />
            <p className="text-[10px] text-muted-foreground text-right">{question.length}/200</p>
          </div>

          {/* Opções */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Opções (2–4)
            </label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(i, e.target.value.slice(0, 200))}
                  placeholder={`Opção ${i + 1}`}
                  className={cn(
                    'flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm',
                    'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors'
                  )}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(i)}
                    className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remover opção ${i + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button
                onClick={addOption}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium self-start"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Adicionar opção
              </button>
            )}
          </div>

          {/* Error */}
          {mutation.isError && (
            <p className="text-xs text-red-500 text-center">
              {(mutation.error as Error)?.message || 'Erro ao criar enquete'}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-border bg-card text-sm font-medium py-2.5 text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!isValid || mutation.isPending}
              className={cn(
                'flex-1 rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2.5',
                'hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors',
                'flex items-center justify-center gap-2'
              )}
            >
              {mutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Criando…</>
              ) : (
                'Publicar enquete'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
