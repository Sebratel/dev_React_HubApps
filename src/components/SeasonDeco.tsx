/**
 * SeasonDeco — ilustração decorativa de estação do ano.
 * Desenhada em Canvas, posicionada à direita do hero do dashboard.
 *
 * Uso: <SeasonDeco season="inverno" className="..." />
 */
import { useEffect, useRef, memo } from 'react'
import type { Season } from '@/utils/season'

interface Props {
  season: Season
  className?: string
}

// ─── Draw functions ───────────────────────────────────────────────────────────

function drawInverno(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const flakes = [
    { x: 0.18, y: 0.12, r: 20, a: 0.55 },
    { x: 0.62, y: 0.06, r: 12, a: 0.38 },
    { x: 0.85, y: 0.32, r: 16, a: 0.50 },
    { x: 0.38, y: 0.55, r:  9, a: 0.28 },
    { x: 0.90, y: 0.08, r: 24, a: 0.72 },
    { x: 0.52, y: 0.42, r: 14, a: 0.45 },
    { x: 0.22, y: 0.75, r:  8, a: 0.25 },
    { x: 0.72, y: 0.68, r: 11, a: 0.35 },
  ]

  flakes.forEach(({ x, y, r, a }) => {
    ctx.save()
    ctx.globalAlpha = a
    ctx.strokeStyle = '#93C5FD'
    ctx.lineWidth   = Math.max(1, r * 0.11)
    ctx.lineCap     = 'round'
    ctx.translate(x * W, y * H)
    for (let i = 0; i < 6; i++) {
      ctx.save()
      ctx.rotate((i * Math.PI) / 3)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke()
      // branches
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.28, -r * 0.72); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo( r * 0.28, -r * 0.72); ctx.stroke()
      ctx.restore()
    }
    // center dot
    ctx.fillStyle = '#BFDBFE'
    ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  })
}

function drawPrimavera(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const flowers = [
    { x: 0.12, y: 0.14, r: 12, petals: '#F9A8D4', center: '#FDE68A' },
    { x: 0.52, y: 0.05, r:  9, petals: '#FDA4AF', center: '#FEF08A' },
    { x: 0.84, y: 0.28, r: 14, petals: '#F9A8D4', center: '#FDE68A' },
    { x: 0.32, y: 0.52, r:  8, petals: '#FBCFE8', center: '#FDE68A' },
    { x: 0.76, y: 0.60, r: 11, petals: '#FDA4AF', center: '#FEF3C7' },
    { x: 0.92, y: 0.08, r: 10, petals: '#F9A8D4', center: '#FEF08A' },
    { x: 0.20, y: 0.82, r:  7, petals: '#FBCFE8', center: '#FEF3C7' },
    { x: 0.65, y: 0.84, r:  9, petals: '#FDA4AF', center: '#FDE68A' },
  ]

  flowers.forEach(({ x, y, r, petals, center }, i) => {
    ctx.save()
    ctx.globalAlpha = 0.45 + (i % 3) * 0.1
    ctx.translate(x * W, y * H)
    for (let p = 0; p < 5; p++) {
      const a = (p * Math.PI * 2) / 5 - Math.PI / 2
      ctx.fillStyle = petals
      ctx.beginPath()
      ctx.ellipse(
        Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72,
        r * 0.52, r * 0.32, a,
        0, Math.PI * 2,
      )
      ctx.fill()
    }
    ctx.fillStyle = center
    ctx.beginPath(); ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2); ctx.fill()
    // stem
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#86EFAC'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, r * 2.2); ctx.stroke()
    ctx.restore()
  })
}

function drawVerao(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Sun
  const sx = W * 0.78, sy = H * 0.18, sr = 26

  ctx.save()
  ctx.globalAlpha = 0.75

  // rays
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(sx + Math.cos(a) * (sr + 7), sy + Math.sin(a) * (sr + 7))
    ctx.lineTo(sx + Math.cos(a) * (sr + 18), sy + Math.sin(a) * (sr + 18))
    ctx.stroke()
  }

  // sun body
  const sg = ctx.createRadialGradient(sx - 5, sy - 5, 2, sx, sy, sr)
  sg.addColorStop(0, '#FEF08A')
  sg.addColorStop(1, '#FCD34D')
  ctx.fillStyle = sg
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()

  ctx.restore()

  // waves
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.strokeStyle = '#38BDF8'
  ctx.lineCap     = 'round'
  for (let w = 0; w < 4; w++) {
    ctx.lineWidth = 2.5 - w * 0.4
    const wy = H * 0.65 + w * 16
    ctx.beginPath()
    ctx.moveTo(0, wy)
    for (let x = 0; x <= W; x += 14) {
      ctx.quadraticCurveTo(x + 7, wy + (w % 2 === 0 ? -6 : 6), x + 14, wy)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawOutono(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const leaves = [
    { x: 0.15, y: 0.09, rot:  0.3, color: '#FB923C', s: 15 },
    { x: 0.58, y: 0.05, rot: -0.5, color: '#F97316', s: 11 },
    { x: 0.84, y: 0.24, rot:  0.8, color: '#EA580C', s: 17 },
    { x: 0.30, y: 0.48, rot: -0.2, color: '#FCD34D', s: 12 },
    { x: 0.72, y: 0.44, rot:  0.6, color: '#DC2626', s: 14 },
    { x: 0.92, y: 0.06, rot: -0.8, color: '#F59E0B', s: 10 },
    { x: 0.46, y: 0.76, rot:  0.4, color: '#FB923C', s:  9 },
    { x: 0.18, y: 0.70, rot: -0.6, color: '#FBBF24', s: 11 },
    { x: 0.78, y: 0.78, rot:  1.1, color: '#EA580C', s:  8 },
  ]

  leaves.forEach(({ x, y, rot, color, s }) => {
    ctx.save()
    ctx.translate(x * W, y * H)
    ctx.rotate(rot)
    ctx.globalAlpha = 0.6
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo( s,     -s * 0.5,  s * 1.2,  s * 0.5, 0,  s)
    ctx.bezierCurveTo(-s * 1.2, s * 0.5, -s,     -s * 0.5, 0, -s)
    ctx.fill()
    // vein
    ctx.globalAlpha = 0.18
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke()
    ctx.restore()
  })
}

const DRAW_FN: Record<Season, (ctx: CanvasRenderingContext2D, W: number, H: number) => void> = {
  inverno:   drawInverno,
  primavera: drawPrimavera,
  'verão':   drawVerao,
  outono:    drawOutono,
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SeasonDeco = memo(function SeasonDeco({ season, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    DRAW_FN[season]?.(ctx, canvas.width, canvas.height)
  }, [season])

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={200}
      className={className}
      aria-hidden
    />
  )
})
