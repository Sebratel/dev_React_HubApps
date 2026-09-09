/**
 * AvatarGenerator — cria avatar com Gemini AI e salva como foto de perfil.
 *
 * Uso: <AvatarGenerator onSaved={(url) => updateUser({ photoUrl: url })} />
 */
import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Upload, RefreshCw, Check, X, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { generateAvatar, saveAvatar } from '@/services/avatar.service'
import type { AvatarStyle } from '@/services/avatar.service'
import { cn } from '@/lib/utils'

// ─── Estilos disponíveis ──────────────────────────────────────────────────────

const STYLES: { id: AvatarStyle; emoji: string; label: string; desc: string }[] = [
  { id: 'cartoon',      emoji: '🎨', label: 'Cartoon',      desc: 'Flat design, contornos marcados'     },
  { id: 'illustrated',  emoji: '✏️',  label: 'Ilustrado',    desc: 'Arte manual, traços artísticos'      },
  { id: 'anime',        emoji: '🌸', label: 'Anime',        desc: 'Olhos expressivos, traço japonês'    },
  { id: 'professional', emoji: '🕴️',  label: 'Profissional', desc: 'Clean, sério, fundo neutro'          },
  { id: 'pixel',        emoji: '🎮', label: 'Pixel Art',    desc: 'Estilo retrô 16-bit'                 },
  { id: 'watercolor',   emoji: '🖼️',  label: 'Aquarela',    desc: 'Suave, tons pastéis, pinceladas'     },
]

// ─── Loading steps ────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  'Analisando o estilo…',
  'Gerando variações…',
  'Aplicando detalhes…',
  'Finalizando ✦',
]

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  onSaved?: (photoUrl: string) => void
}

export function AvatarGenerator({ onSaved }: Props) {
  const [style,        setStyle]        = useState<AvatarStyle>('cartoon')
  const [prompt,       setPrompt]       = useState('')
  const [photoBase64,  setPhotoBase64]  = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [images,       setImages]       = useState<string[]>([])
  const [selected,     setSelected]     = useState<number | null>(null)
  const [loadingStep,  setLoadingStep]  = useState(0)
  const [saved,        setSaved]        = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Mutations ─────────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: generateAvatar,
    onMutate: () => {
      setImages([])
      setSelected(null)
      setSaved(false)
      setLoadingStep(0)
      let i = 0
      stepTimerRef.current = setInterval(() => {
        i = (i + 1) % LOADING_STEPS.length
        setLoadingStep(i)
      }, 1100)
    },
    onSuccess: (data) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      clearInterval(stepTimerRef.current!)
      setImages(data.images)
      setSelected(0)
    },
    onError: () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      clearInterval(stepTimerRef.current!)
    },
  })

  const saveMutation = useMutation({
    mutationFn: saveAvatar,
    onSuccess: (data) => {
      setSaved(true)
      onSaved?.(data.photoUrl)
    },
  })

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setPhotoPreview(result)
      // Remove prefixo "data:image/...;base64,"
      setPhotoBase64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }, [])

  const handleGenerate = useCallback(() => {
    generateMutation.mutate({ style, prompt: prompt.trim(), photoBase64 })
  }, [generateMutation, style, prompt, photoBase64])

  const handleSave = useCallback(() => {
    if (selected === null || !images[selected]) return
    saveMutation.mutate(images[selected])
  }, [saveMutation, selected, images])

  const isGenerating = generateMutation.isPending
  const isSaving     = saveMutation.isPending
  const hasResults   = images.length > 0

  return (
    <div className="flex flex-col gap-6">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
        >
          <Sparkles className="h-4.5 w-4.5 text-white" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Criar Avatar com IA</h3>
          <p className="text-xs text-muted-foreground">Gerado por IA — único para você</p>
        </div>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}
        >
          ✦ IA
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* ── Coluna esquerda: configuração ────────────────────────────────── */}
        <div className="flex flex-col gap-5">

          {/* Estilo */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estilo</p>
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all',
                    style === s.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-border bg-card hover:border-violet-300'
                  )}
                >
                  <span className="text-xl leading-none">{s.emoji}</span>
                  <span className={cn('text-[11px] font-semibold', style === s.id ? 'text-violet-700 dark:text-violet-400' : 'text-foreground')}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Descrição <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 200))}
              placeholder="Ex: cabelo curto castanho, óculos, camisa azul, sorrindo..."
              rows={3}
              className={cn(
                'w-full resize-none rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm',
                'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-violet-400/30',
                'leading-relaxed transition-colors'
              )}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{prompt.length}/200</p>
          </div>

          {/* Foto de referência */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Foto de referência <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            {photoPreview ? (
              <div className="flex items-center gap-3 rounded-xl border border-violet-300 bg-violet-50/50 dark:bg-violet-900/10 p-3">
                <img src={photoPreview} alt="Referência" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">Foto adicionada ✓</p>
                  <p className="text-[11px] text-muted-foreground">A IA vai se inspirar no seu rosto</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPhotoBase64(null); setPhotoPreview(null) }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-4',
                  'text-muted-foreground transition-colors hover:border-violet-300 hover:text-foreground'
                )}
              >
                <Upload className="h-5 w-5" />
                <span className="text-xs">Envie uma selfie como referência</span>
              </button>
            )}
          </div>

          {/* Botão gerar */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white',
              'transition-opacity disabled:cursor-not-allowed disabled:opacity-60',
            )}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.35)' }}
          >
            {isGenerating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> {LOADING_STEPS[loadingStep]}</>
              : <><Sparkles className="h-4 w-4" /> Gerar com IA</>
            }
          </button>

          {generateMutation.isError && (
            <p className="text-xs text-red-500 text-center">
              {(generateMutation.error as Error)?.message || 'Erro ao gerar. Tente novamente.'}
            </p>
          )}
        </div>

        {/* ── Coluna direita: resultado ──────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado</p>

          <AnimatePresence mode="wait">
            {isGenerating ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-violet-200 bg-violet-50/30 dark:bg-violet-900/10 py-12"
              >
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 animate-spin rounded-full border-4 border-violet-100 border-t-violet-500" style={{ animationDuration: '0.9s' }} />
                  <div className="absolute inset-3 animate-spin rounded-full border-4 border-violet-100 border-t-indigo-400" style={{ animationDuration: '1.3s', animationDirection: 'reverse' }} />
                  <div className="absolute inset-0 flex items-center justify-center text-xl">✦</div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{LOADING_STEPS[loadingStep]}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Gerando 4 variações para você</p>
                </div>
              </motion.div>
            ) : hasResults ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setSelected(i); setSaved(false) }}
                      className={cn(
                        'overflow-hidden rounded-xl border-2 transition-all',
                        selected === i
                          ? 'border-violet-500 shadow-md shadow-violet-200 dark:shadow-violet-900/40'
                          : 'border-border hover:border-violet-300'
                      )}
                    >
                      <img
                        src={`data:image/png;base64,${img}`}
                        alt={`Variação ${i + 1}`}
                        className="w-full aspect-square object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* Ações */}
                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Regerar
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={selected === null || isSaving || saved}
                    className={cn(
                      'flex flex-2 flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white transition-all',
                      saved
                        ? 'bg-emerald-500'
                        : 'disabled:opacity-50'
                    )}
                    style={!saved ? { background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' } : undefined}
                  >
                    {isSaving
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</>
                      : saved
                      ? <><Check className="h-3.5 w-3.5" /> Avatar salvo!</>
                      : '✓ Usar este avatar'
                    }
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 py-12 text-center"
              >
                <span className="text-4xl">🎨</span>
                <p className="text-xs text-muted-foreground">
                  Configure o estilo e clique em<br />
                  <strong className="text-foreground">Gerar com IA</strong>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
