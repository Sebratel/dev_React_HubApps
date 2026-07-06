import { useEffect, useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UploadCloud, Link as LinkIcon, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { uploadFile, resolveAssetUrl } from '@/lib/api'
import type { HighlightModel } from '@/types/models'

const BADGE_PRESETS = ['NOVIDADE', 'EM BREVE', 'ATUALIZAÇÃO', 'DESTAQUE']

const FIT_OPTIONS = [
  {
    value: 'cover',
    label: 'Preencher',
    description: 'Imagem preenche o banner (pode cortar)',
    icon: (
      <svg viewBox="0 0 28 18" fill="none" className="w-7 h-[18px]">
        <rect x="0" y="0" width="28" height="18" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="0" y="0" width="28" height="18" rx="2" fill="currentColor" opacity="0.35" />
        <rect x="-3" y="-2" width="34" height="22" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    value: 'contain',
    label: 'Ajustar',
    description: 'Imagem inteira visível (com fundo)',
    icon: (
      <svg viewBox="0 0 28 18" fill="none" className="w-7 h-[18px]">
        <rect x="0" y="0" width="28" height="18" rx="2" fill="currentColor" opacity="0.12" />
        <rect x="5" y="2" width="18" height="14" rx="1.5" fill="currentColor" opacity="0.5" />
      </svg>
    ),
  },
]

const POSITIONS = [
  { value: 'top left',     row: 0, col: 0 },
  { value: 'top',          row: 0, col: 1 },
  { value: 'top right',    row: 0, col: 2 },
  { value: 'left',         row: 1, col: 0 },
  { value: 'center',       row: 1, col: 1 },
  { value: 'right',        row: 1, col: 2 },
  { value: 'bottom left',  row: 2, col: 0 },
  { value: 'bottom',       row: 2, col: 1 },
  { value: 'bottom right', row: 2, col: 2 },
]

const POSITION_LABELS: Record<string, string> = {
  'top left':     'Canto superior esquerdo',
  'top':          'Topo ao centro',
  'top right':    'Canto superior direito',
  'left':         'Esquerda ao centro',
  'center':       'Centro',
  'right':        'Direita ao centro',
  'bottom left':  'Canto inferior esquerdo',
  'bottom':       'Base ao centro',
  'bottom right': 'Canto inferior direito',
}

const schema = z.object({
  title:          z.string().min(1, 'Título obrigatório').max(255),
  description:    z.string().max(500).optional(),
  badgeText:      z.string().max(50).optional(),
  ctaLabel:       z.string().max(100).optional(),
  ctaUrl:         z.string().url('URL inválida').or(z.literal('')).optional(),
  imageUrl:       z.string().min(1, 'Imagem obrigatória').refine(
    (v) =>
      v.startsWith('data:image/')
      || v.startsWith('http://')
      || v.startsWith('https://')
      || v.startsWith('/api/uploads/')
      || v.startsWith('/uploads/'),
    'Use uma URL válida ou faça upload de uma imagem',
  ),
  objectFit:      z.enum(['cover', 'contain']),
  objectPosition: z.string(),
  sortOrder:      z.coerce.number().int().min(0).optional(),
  isActive:       z.boolean(),
})

export type HighlightFormValues = z.infer<typeof schema>

interface HighlightFormDialogProps {
  highlight?: HighlightModel
  open: boolean
  isPending: boolean
  error: string | null
  onConfirm: (values: HighlightFormValues) => void
  onClose: () => void
}

export function HighlightFormDialog({
  highlight, open, isPending, error, onConfirm, onClose,
}: HighlightFormDialogProps) {
  const isEdit = !!highlight

  // Three generics so the zod `coerce` input type (sortOrder: unknown) and the
  // transformed output type (sortOrder: number) both line up with the resolver.
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<
    z.input<typeof schema>,
    unknown,
    HighlightFormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: {
      title:          highlight?.title          ?? '',
      description:    highlight?.description    ?? '',
      badgeText:      highlight?.badgeText      ?? 'NOVIDADE',
      ctaLabel:       highlight?.ctaLabel       ?? 'Explorar Agora',
      ctaUrl:         highlight?.ctaUrl         ?? '',
      imageUrl:       highlight?.imageUrl       ?? '',
      objectFit:      highlight?.objectFit      ?? 'cover',
      objectPosition: highlight?.objectPosition ?? 'center',
      sortOrder:      highlight?.sortOrder      ?? 0,
      isActive:       highlight?.isActive       ?? true,
    },
  })

  // Upload state
  const [imageSource, setImageSource]       = useState<'url' | 'upload'>('url')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadError, setUploadError]       = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      reset({
        title:          highlight?.title          ?? '',
        description:    highlight?.description    ?? '',
        badgeText:      highlight?.badgeText      ?? 'NOVIDADE',
        ctaLabel:       highlight?.ctaLabel       ?? 'Explorar Agora',
        ctaUrl:         highlight?.ctaUrl         ?? '',
        imageUrl:       highlight?.imageUrl       ?? '',
        objectFit:      highlight?.objectFit      ?? 'cover',
        objectPosition: highlight?.objectPosition ?? 'center',
        sortOrder:      highlight?.sortOrder      ?? 0,
        isActive:       highlight?.isActive       ?? true,
      })
      setImageSource('url')
      setUploadProgress(null)
      setUploadError(null)
      setUploadedFileName(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, highlight?.id])

  const imageUrl       = watch('imageUrl')
  const badgeText      = watch('badgeText')
  const objectFit      = watch('objectFit')
  const objectPosition = watch('objectPosition')

  const handleUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Selecione um arquivo de imagem (JPG, PNG, WebP…)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Imagem muito grande. Máximo 10 MB.')
      return
    }

    setUploadError(null)
    setUploadProgress(0)
    setUploadedFileName(file.name)

    try {
      const url = await uploadFile('/upload/highlights', file, setUploadProgress)
      setValue('imageUrl', url, { shouldValidate: true })
    } catch (err) {
      setUploadError(err instanceof Error ? `Erro ao enviar: ${err.message}` : 'Erro ao enviar o arquivo')
    } finally {
      setUploadProgress(null)
    }
  }, [setValue])

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleUpload(file)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleUpload(file)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl p-0 flex flex-col max-h-[90vh] overflow-hidden gap-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>{isEdit ? 'Editar destaque' : 'Novo destaque'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6">
          <form
            id="highlight-form"
            onSubmit={(e) => { void handleSubmit(onConfirm)(e) }}
            className="flex flex-col gap-4 pb-2"
            noValidate
          >
            {/* ── Image source ──────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Imagem <span className="text-destructive">*</span>
              </span>

              {/* Source toggle */}
              <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 self-start">
                <button
                  type="button"
                  onClick={() => setImageSource('url')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    imageSource === 'url'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageSource('upload')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                    imageSource === 'upload'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  Meu computador
                </button>
              </div>

              {/* URL input */}
              {imageSource === 'url' && (
                <div className="flex flex-col gap-1">
                  <Input
                    id="h-image"
                    placeholder="https://images.unsplash.com/..."
                    aria-invalid={!!errors.imageUrl}
                    {...register('imageUrl')}
                  />
                  {errors.imageUrl && <p className="text-xs text-destructive">{errors.imageUrl.message}</p>}
                </div>
              )}

              {/* Upload zone */}
              {imageSource === 'upload' && (
                <div className="flex flex-col gap-2">
                  {/* Drop zone */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors',
                      isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50',
                    )}
                  >
                    <UploadCloud className={cn('h-8 w-8', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {isDragging ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique para escolher'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WebP, GIF — máx. 10 MB</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />

                  {/* Upload progress */}
                  {uploadProgress !== null && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate max-w-[280px]">{uploadedFileName}</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Upload success — show filename with clear button */}
                  {uploadProgress === null && uploadedFileName && imageUrl && (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                      <UploadCloud className="h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs text-foreground truncate flex-1">{uploadedFileName}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFileName(null)
                          setValue('imageUrl', '', { shouldValidate: false })
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remover imagem"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
                  {errors.imageUrl && !uploadedFileName && (
                    <p className="text-xs text-destructive">{errors.imageUrl.message}</p>
                  )}
                </div>
              )}

              {/* Live preview */}
              {imageUrl && (
                <div
                  className="relative overflow-hidden rounded-xl bg-neutral-900"
                  style={{ aspectRatio: '16/9' }}
                >
                  {objectFit === 'contain' && (
                    <img
                      src={resolveAssetUrl(imageUrl)}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full object-cover scale-150"
                      style={{ filter: 'blur(64px)', opacity: 0.55 }}
                    />
                  )}
                  <img
                    src={resolveAssetUrl(imageUrl)}
                    alt="preview"
                    className="absolute inset-0 h-full w-full"
                    style={{
                      objectFit,
                      objectPosition: objectFit === 'cover' ? objectPosition : 'center',
                    }}
                  />
                  <div className="absolute bottom-1.5 right-2 text-[10px] font-medium text-white/60 bg-black/30 rounded px-1.5 py-0.5 backdrop-blur-sm select-none">
                    pré-visualização
                  </div>
                </div>
              )}
            </div>

            {/* ── Image formatting ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <span className="text-sm font-medium">Formatação da imagem</span>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Modo de exibição</span>
                <div className="flex gap-2">
                  {FIT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('objectFit', opt.value as 'cover' | 'contain')}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-2 rounded-xl border px-3 py-3 text-xs font-medium transition-all',
                        objectFit === opt.value
                          ? 'border-primary bg-primary/8 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
                      )}
                      title={opt.description}
                    >
                      <span className={cn(objectFit === opt.value ? 'text-primary' : 'text-muted-foreground')}>
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {objectFit === 'cover' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Posição do foco</span>
                    <span className="text-[11px] text-muted-foreground/70">{POSITION_LABELS[objectPosition] ?? objectPosition}</span>
                  </div>
                  <div className="inline-grid grid-cols-3 gap-1 self-start">
                    {POSITIONS.map((pos) => (
                      <button
                        key={pos.value}
                        type="button"
                        onClick={() => setValue('objectPosition', pos.value)}
                        title={POSITION_LABELS[pos.value]}
                        aria-label={POSITION_LABELS[pos.value]}
                        className={cn(
                          'h-8 w-8 rounded-md transition-all flex items-center justify-center',
                          objectPosition === pos.value
                            ? 'bg-primary shadow-sm'
                            : 'bg-card border border-border hover:bg-muted hover:border-muted-foreground/40',
                        )}
                      >
                        <span
                          className={cn(
                            'block rounded-full',
                            objectPosition === pos.value ? 'bg-primary-foreground w-2 h-2' : 'bg-muted-foreground w-1.5 h-1.5',
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Title ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="h-title" className="text-sm font-medium">
                Título <span className="text-destructive">*</span>
              </label>
              <Input id="h-title" placeholder="Ex: Novo Módulo de Gestão de Projetos" aria-invalid={!!errors.title} {...register('title')} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            {/* ── Description ───────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="h-desc" className="text-sm font-medium">Descrição</label>
              <textarea
                id="h-desc"
                rows={2}
                placeholder="Breve descrição que aparece abaixo do título"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                {...register('description')}
              />
            </div>

            {/* ── Badge ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Badge</span>
              <div className="flex flex-wrap gap-2 mb-1">
                {BADGE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setValue('badgeText', preset)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-bold transition-colors',
                      badgeText === preset
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70',
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input id="h-badge" placeholder="NOVIDADE" {...register('badgeText')} />
            </div>

            {/* ── CTA ───────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="h-cta-label" className="text-sm font-medium">Texto do botão</label>
                <Input id="h-cta-label" placeholder="Explorar Agora" {...register('ctaLabel')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="h-cta-url" className="text-sm font-medium">URL do botão</label>
                <Input id="h-cta-url" type="url" placeholder="https://..." aria-invalid={!!errors.ctaUrl} {...register('ctaUrl')} />
                {errors.ctaUrl && <p className="text-xs text-destructive">{errors.ctaUrl.message}</p>}
              </div>
            </div>

            {/* ── Order + Active ─────────────────────────────────────────────── */}
            <div className="flex items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="h-order" className="text-sm font-medium">Ordem</label>
                <Input id="h-order" type="number" min={0} className="w-24" {...register('sortOrder')} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none pb-1">
                <input type="checkbox" className="h-4 w-4 rounded border-input" {...register('isActive')} />
                <span className="text-sm font-medium">Ativo</span>
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}
          </form>
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button type="submit" form="highlight-form" disabled={isPending || uploadProgress !== null}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar destaque'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
