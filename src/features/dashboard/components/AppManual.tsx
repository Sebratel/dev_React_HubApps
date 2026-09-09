import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { BookOpen, FileText, Globe, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react'
import { AppIcon } from '@/components/app-icon'
import type { AppManualModel } from '@/types/models'

// ── Wiki popup modal ──────────────────────────────────────────────────────────

interface WikiModalProps {
  manual: AppManualModel
  onClose: () => void
}

function isEmbeddable(url: string) {
  return url.includes('docs.google.com/presentation') && url.includes('pubembed')
}

function WikiModal({ manual, onClose }: WikiModalProps) {
  const [loaded, setLoaded] = useState(false)
  const embeddable = isEmbeddable(manual.wikiUrl ?? '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        className="relative overflow-hidden rounded-3xl bg-card shadow-2xl"
        style={{ width: embeddable ? 'min(92vw, 900px)' : 'min(92vw, 440px)' }}
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
      >
        {/* Amber top bar */}
        <div
          className="h-1.5 w-full"
          style={{ background: 'linear-gradient(90deg, #FFD580, #FFB000, #FF8C00)' }}
        />

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <AppIcon
            icon={manual.appIcon ?? '📦'}
            name={manual.appName}
            size="sm"
            showBackground
            className="shrink-0 rounded-xl"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
              Manual
            </p>
            <p className="truncate text-sm font-bold" style={{ color: '#2d1800' }}>{manual.appName}</p>
          </div>
          <a
            href={manual.wikiUrl ?? ''}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Abrir em nova aba
          </a>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {embeddable ? (
          /* ── Google Slides pubembed ── */
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            {!loaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/40">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}>
                  <Globe className="h-6 w-6 text-muted-foreground" />
                </motion.div>
                <span className="text-sm text-muted-foreground">Carregando apresentação…</span>
              </div>
            )}
            <iframe
              src={manual.wikiUrl ?? ''}
              className="absolute inset-0 h-full w-full border-0"
              title={`Manual ${manual.appName}`}
              onLoad={() => setLoaded(true)}
              allowFullScreen
            />
          </div>
        ) : (
          /* ── External link card ── */
          <div className="flex flex-col items-center gap-5 px-8 pb-8 pt-7 text-center">
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(255,176,0,0.20) 0%, transparent 70%)', filter: 'blur(10px)' }}
                aria-hidden
              />
              <AppIcon
                icon={manual.appIcon ?? '📦'}
                name={manual.appName}
                size="lg"
                showBackground={false}
                className="relative h-16 w-16 rounded-2xl bg-white shadow-[0_8px_24px_-4px_rgba(100,50,0,0.28)] ring-2 ring-white"
              />
            </div>
            {manual.description && (
              <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
                {manual.description}
              </p>
            )}
            <div className="w-12 h-px rounded-full" style={{ background: 'rgba(45,24,0,0.12)' }} />
            <div className="flex flex-col items-center gap-2 w-full">
              <a
                href={manual.wikiUrl ?? ''}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3d2200 0%, #2d1800 100%)',
                  color: '#FFB000',
                  boxShadow: '0 6px 20px rgba(45,24,0,0.35)',
                }}
              >
                <Globe className="h-4 w-4" />
                Abrir wiki do {manual.appName}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
              <p className="text-[11px]" style={{ color: 'rgba(45,24,0,0.38)' }}>
                Abre em uma nova aba do navegador
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Right page content (animates on flip) ─────────────────────────────────────

const pageVariants = {
  enter:  (dir: number) => ({ x: dir > 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:   (dir: number) => ({ x: dir > 0 ? -48 : 48, opacity: 0 }),
}

interface RightPageProps {
  manual: AppManualModel
  direction: number
  reduced: boolean
  index: number
  total: number
}

function RightPage({ manual, direction, reduced, index, total }: RightPageProps) {
  return (
    <AnimatePresence initial={false} custom={direction} mode="wait">
      <motion.div
        key={manual.id}
        custom={direction}
        variants={reduced ? {} : pageVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4"
      >
        {/* Halo */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(50% 55% at 50% 42%, rgba(255,176,0,0.14) 0%, transparent 80%)',
          }}
          aria-hidden
        />

        {/* App icon */}
        <div className="relative shrink-0">
          <div
            className="absolute -inset-3 rounded-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,176,0,0.22) 0%, transparent 70%)', filter: 'blur(8px)' }}
            aria-hidden
          />
          <AppIcon
            icon={manual.appIcon ?? '📦'}
            name={manual.appName}
            size="lg"
            showBackground={false}
            className="relative h-16 w-16 rounded-2xl bg-white shadow-[0_8px_24px_-4px_rgba(100,50,0,0.30)] ring-2 ring-white"
          />
        </div>

        {/* Name */}
        <div className="relative text-center">
          <p className="text-[13px] font-extrabold leading-tight" style={{ color: '#2d1800' }}>
            {manual.appName.length > 22 ? manual.appName.slice(0, 22).trimEnd() + '…' : manual.appName}
          </p>
          <p className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'rgba(45,24,0,0.38)' }}>
            Manual disponível
          </p>
        </div>

        {/* Page number */}
        <span
          className="absolute bottom-3 right-3 text-[9px] font-bold tabular-nums"
          style={{ color: 'rgba(45,24,0,0.28)', letterSpacing: '0.06em' }}
        >
          {index + 1}/{total}
        </span>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface AppManualProps {
  manuals: AppManualModel[]
}

export function AppManual({ manuals }: AppManualProps) {
  const reduced = useReducedMotion()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction,    setDirection]    = useState(0)
  const [wikiOpen,     setWikiOpen]     = useState(false)

  if (!manuals.length) return null

  const manual = manuals[currentIndex]
  const total  = manuals.length

  function goNext() {
    if (currentIndex >= total - 1) return
    setDirection(1)
    setCurrentIndex(i => i + 1)
  }

  function goPrev() {
    if (currentIndex <= 0) return
    setDirection(-1)
    setCurrentIndex(i => i - 1)
  }

  return (
    <>
      <motion.section
        aria-label="Manuais dos Aplicativos"
        className="overflow-hidden rounded-3xl"
        style={{
          background: 'rgba(255,255,255,0.52)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.72)',
          boxShadow: '0 4px 28px rgba(0,0,0,0.06)',
        }}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ── Section header ─────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: 'rgba(45,24,0,0.07)', background: 'linear-gradient(135deg, rgba(255,176,0,0.07) 0%, transparent 55%)' }}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(255,176,0,0.14)' }}>
              <BookOpen className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
            </span>
            <div>
              <h2 className="text-[15px] font-extrabold leading-tight tracking-tight" style={{ color: '#2d1800' }}>
                Manuais dos Aplicativos
              </h2>
              <p className="text-[11px]" style={{ color: 'rgba(45,24,0,0.45)' }}>
                {total} {total === 1 ? 'manual disponível' : 'manuais disponíveis'}
              </p>
            </div>
          </div>

          {/* Nav dots — header */}
          {total > 1 && (
            <div className="flex items-center gap-1.5">
              {manuals.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i) }}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width:  i === currentIndex ? 18 : 5,
                    height: 5,
                    background: i === currentIndex ? '#2d1800' : 'rgba(45,24,0,0.15)',
                  }}
                  aria-label={`Manual ${i + 1}`}
                  aria-current={i === currentIndex ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center sm:p-8">

          {/* ── Book visual ──────────────────────────────────────────────── */}
          <div className="relative shrink-0" style={{ perspective: '900px' }}>
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{
                width: 270,
                height: 210,
                boxShadow: '0 8px 32px -8px rgba(45,24,0,0.30), 0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid rgba(45,24,0,0.08)',
              }}
            >
              {/* ── Left page — dark book cover ── */}
              <div
                className="absolute inset-y-0 left-0 flex flex-col items-center justify-between py-5 px-4"
                style={{ width: '42%', background: 'linear-gradient(155deg, #3d2200 0%, #2d1800 60%, #1e0e00 100%)' }}
              >
                {/* Top amber glow */}
                <div
                  className="absolute inset-x-0 top-0 h-16 pointer-events-none"
                  style={{ background: 'linear-gradient(180deg, rgba(255,176,0,0.18) 0%, transparent 100%)' }}
                  aria-hidden
                />

                {/* Cover content */}
                <div className="relative flex flex-col items-center gap-2 mt-2">
                  <BookOpen className="h-7 w-7" style={{ color: '#FFB000' }} />
                </div>

                <div className="relative flex w-full flex-col gap-[4px]">
                  <div className="h-[2.5px] rounded-full" style={{ background: 'rgba(255,176,0,0.35)' }} />
                  <div className="h-[2.5px] w-5/6 rounded-full" style={{ background: 'rgba(255,176,0,0.20)' }} />
                  <div className="h-[2.5px] w-4/6 rounded-full" style={{ background: 'rgba(255,176,0,0.12)' }} />
                </div>

                <span
                  className="relative text-[8.5px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: 'rgba(255,176,0,0.45)' }}
                >
                  Manual
                </span>
              </div>

              {/* ── Spine — amber gradient ── */}
              <div
                className="absolute inset-y-0"
                style={{
                  left: 'calc(42% - 1px)',
                  width: 10,
                  background: 'linear-gradient(90deg, rgba(45,24,0,0.55) 0%, rgba(80,40,0,0.18) 50%, rgba(0,0,0,0.04) 100%)',
                  zIndex: 2,
                }}
              />
              <div
                className="absolute inset-y-3"
                style={{
                  left: 'calc(42% + 9px)',
                  width: 1.5,
                  background: 'linear-gradient(180deg, transparent 0%, rgba(45,24,0,0.10) 50%, transparent 100%)',
                  zIndex: 2,
                }}
              />

              {/* ── Right page — cream, animated ── */}
              <div
                className="absolute inset-y-0 right-0"
                style={{ left: 'calc(42% + 11px)', background: '#FFF8EE' }}
              >
                <RightPage
                  manual={manual}
                  direction={direction}
                  reduced={!!reduced}
                  index={currentIndex}
                  total={total}
                />

                {/* Page lines decoration */}
                <div className="pointer-events-none absolute bottom-6 left-4 right-4 flex flex-col gap-[5px]" aria-hidden>
                  <div className="h-px rounded-full" style={{ background: 'rgba(45,24,0,0.06)' }} />
                  <div className="h-px w-4/5 rounded-full" style={{ background: 'rgba(45,24,0,0.04)' }} />
                </div>
              </div>

              {/* Hover click zones */}
              <button
                className="absolute inset-y-0 left-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-150"
                style={{ width: '42%' }}
                onClick={goPrev}
                disabled={currentIndex === 0}
                aria-label="Manual anterior"
                tabIndex={-1}
              >
                {currentIndex > 0 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm">
                    <ChevronLeft className="h-4 w-4 text-amber-200" />
                  </span>
                )}
              </button>

              <button
                className="absolute inset-y-0 right-0 z-10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-150"
                style={{ left: 'calc(42% + 11px)' }}
                onClick={goNext}
                disabled={currentIndex >= total - 1}
                aria-label="Próximo manual"
                tabIndex={-1}
              >
                {currentIndex < total - 1 && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(45,24,0,0.12)', backdropFilter: 'blur(4px)' }}>
                    <ChevronRight className="h-4 w-4" style={{ color: '#2d1800' }} />
                  </span>
                )}
              </button>
            </div>

            {/* Arrow nav below — only when multiple */}
            {total > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Manual anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex >= total - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Próximo manual"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ── Content area ─────────────────────────────────────────────── */}
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={manual.id + '-content'}
                custom={direction}
                variants={reduced ? {} : {
                  enter:  (d: number) => ({ x: d > 0 ? 24 : -24, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit:   (d: number) => ({ x: d > 0 ? -24 : 24, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-3"
              >
                {/* App name */}
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-xl font-extrabold leading-tight tracking-tight" style={{ color: '#2d1800' }}>
                      {manual.appName}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest" style={{ color: 'hsl(var(--primary))' }}>
                      Manual do aplicativo
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground max-w-sm">
                  {manual.description
                    ? manual.description
                    : `Documentação oficial do ${manual.appName} — consulte diretrizes, tutoriais e guias de uso.`}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2.5">
              {manual.wikiUrl && (
                <button
                  onClick={() => setWikiOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #3d2200 0%, #2d1800 100%)',
                    color: '#FFB000',
                    boxShadow: '0 4px 16px rgba(45,24,0,0.32)',
                  }}
                >
                  <Globe className="h-4 w-4" aria-hidden />
                  Consultar Wiki
                </button>
              )}
              {manual.pdfUrl && (
                <a
                  href={manual.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
                  style={{
                    borderColor: 'rgba(45,24,0,0.20)',
                    color: '#2d1800',
                    background: 'rgba(45,24,0,0.04)',
                  }}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  Visualizar Manual
                </a>
              )}
            </div>
          </div>

        </div>
      </motion.section>

      {wikiOpen && manual.wikiUrl && (
        <WikiModal manual={manual} onClose={() => setWikiOpen(false)} />
      )}
    </>
  )
}
