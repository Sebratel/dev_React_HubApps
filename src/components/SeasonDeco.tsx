import { useEffect, useRef, memo } from 'react'
import type { Season } from '@/utils/season'

interface Props {
  season: Season
  className?: string
}

type Mouse = { x: number; y: number } | null

// ─── Draw functions ───────────────────────────────────────────────────────────

const FLAKES = [
  { x: 0.88, y: 0.10, r: 28, a: 0.82, speed: 0.6 },
  { x: 0.60, y: 0.06, r: 18, a: 0.62, speed: 0.9 },
  { x: 0.78, y: 0.42, r: 22, a: 0.68, speed: 0.7 },
  { x: 0.42, y: 0.55, r: 13, a: 0.42, speed: 1.1 },
  { x: 0.92, y: 0.60, r: 16, a: 0.50, speed: 0.8 },
  { x: 0.55, y: 0.28, r: 11, a: 0.35, speed: 1.2 },
  { x: 0.25, y: 0.72, r:  9, a: 0.28, speed: 0.95 },
  { x: 0.70, y: 0.78, r: 14, a: 0.40, speed: 0.75 },
]

function drawFlake(ctx: CanvasRenderingContext2D, r: number, angle: number) {
  ctx.save()
  ctx.rotate(angle)
  ctx.strokeStyle = '#7DD3FC'
  ctx.lineWidth   = Math.max(1.2, r * 0.12)
  ctx.lineCap     = 'round'
  for (let i = 0; i < 6; i++) {
    ctx.save()
    ctx.rotate((i * Math.PI) / 3)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo(-r * 0.3, -r * 0.74); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, -r * 0.5); ctx.lineTo( r * 0.3, -r * 0.74); ctx.stroke()
    ctx.restore()
  }
  ctx.fillStyle = '#BFDBFE'
  ctx.beginPath(); ctx.arc(0, 0, r * 0.14, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawInverno(ctx: CanvasRenderingContext2D, W: number, H: number, t = 0, mouse: Mouse = null) {
  FLAKES.forEach(({ x, y, r, a, speed }) => {
    const lx = x * W, ly = y * H
    let pushX = 0, pushY = 0
    if (mouse) {
      const mdx = lx - mouse.x, mdy = ly - mouse.y
      const dist = Math.sqrt(mdx * mdx + mdy * mdy)
      const radius = 80
      if (dist < radius && dist > 1) {
        const strength = (1 - dist / radius) ** 2
        pushX = (mdx / dist) * strength * 22
        pushY = (mdy / dist) * strength * 22
      }
    }
    const angle = (t * speed * 0.00018) % (Math.PI * 2)
    const dy = Math.sin(t * speed * 0.00035) * 3
    ctx.save()
    ctx.globalAlpha = a
    ctx.translate(lx + pushX, ly + dy + pushY)
    drawFlake(ctx, r, angle)
    ctx.restore()
  })
}

function drawPrimavera(ctx: CanvasRenderingContext2D, W: number, H: number, t = 0, mouse: Mouse = null) {
  const flowers = [
    { x: 0.12, y: 0.14, r: 12, petals: '#F9A8D4', center: '#FDE68A', speed: 0.8 },
    { x: 0.52, y: 0.05, r:  9, petals: '#FDA4AF', center: '#FEF08A', speed: 1.1 },
    { x: 0.84, y: 0.28, r: 14, petals: '#F9A8D4', center: '#FDE68A', speed: 0.7 },
    { x: 0.32, y: 0.52, r:  8, petals: '#FBCFE8', center: '#FDE68A', speed: 1.3 },
    { x: 0.76, y: 0.60, r: 11, petals: '#FDA4AF', center: '#FEF3C7', speed: 0.9 },
    { x: 0.92, y: 0.08, r: 10, petals: '#F9A8D4', center: '#FEF08A', speed: 1.0 },
    { x: 0.20, y: 0.82, r:  7, petals: '#FBCFE8', center: '#FEF3C7', speed: 1.2 },
    { x: 0.65, y: 0.84, r:  9, petals: '#FDA4AF', center: '#FDE68A', speed: 0.85 },
  ]

  flowers.forEach(({ x, y, r, petals, center, speed }, i) => {
    const lx = x * W, ly = y * H
    let lean = 0, pushY = 0
    if (mouse) {
      const mdx = lx - mouse.x, mdy = ly - mouse.y
      const dist = Math.sqrt(mdx * mdx + mdy * mdy)
      const radius = 70
      if (dist < radius && dist > 1) {
        const strength = (1 - dist / radius) ** 2
        lean = (mdx / dist) * strength * 0.45
        pushY = (mdy / dist) * strength * -6
      }
    }
    const sway = Math.sin(t * speed * 0.00045 + i) * 0.09 + lean
    ctx.save()
    ctx.globalAlpha = 0.45 + (i % 3) * 0.1
    ctx.translate(lx, ly + pushY)
    ctx.rotate(sway)
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
    ctx.globalAlpha = 0.25
    ctx.strokeStyle = '#86EFAC'
    ctx.lineWidth = 1.2
    ctx.beginPath(); ctx.moveTo(0, r); ctx.lineTo(0, r * 2.2); ctx.stroke()
    ctx.restore()
  })
}

function drawVerao(ctx: CanvasRenderingContext2D, W: number, H: number, t = 0, mouse: Mouse = null) {
  const sx = W * 0.78, sy = H * 0.18, sr = 26

  let sunPulse = 0
  if (mouse) {
    const sdx = sx - mouse.x, sdy = sy - mouse.y
    const sd = Math.sqrt(sdx * sdx + sdy * sdy)
    sunPulse = Math.max(0, (1 - sd / 90) ** 2) * 10
  }

  const rayAngle = t * 0.00008
  ctx.save()
  ctx.globalAlpha = 0.75
  ctx.translate(sx, sy)
  ctx.rotate(rayAngle)
  ctx.strokeStyle = '#FCD34D'
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * (sr + 7), Math.sin(a) * (sr + 7))
    ctx.lineTo(Math.cos(a) * (sr + 18 + sunPulse), Math.sin(a) * (sr + 18 + sunPulse))
    ctx.stroke()
  }
  ctx.rotate(-rayAngle)
  const sg = ctx.createRadialGradient(-5, -5, 2, 0, 0, sr)
  sg.addColorStop(0, '#FEF08A')
  sg.addColorStop(1, '#FCD34D')
  ctx.fillStyle = sg
  ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.fill()
  ctx.restore()

  const waveOffset = (t * 0.007) % 14
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.strokeStyle = '#38BDF8'
  ctx.lineCap     = 'round'
  for (let w = 0; w < 4; w++) {
    ctx.lineWidth = 2.5 - w * 0.4
    const wy = H * 0.65 + w * 16
    ctx.beginPath()
    ctx.moveTo(-waveOffset, wy)
    for (let x = -waveOffset; x <= W + 14; x += 14) {
      let ripple = 0
      if (mouse) {
        const rdx = (x + 7) - mouse.x, rdy = wy - mouse.y
        const rd = Math.sqrt(rdx * rdx + rdy * rdy)
        ripple = Math.max(0, (1 - rd / 60) ** 2) * (w % 2 === 0 ? -7 : 7)
      }
      const amp = w % 2 === 0 ? -6 : 6
      ctx.quadraticCurveTo(x + 7, wy + amp + ripple, x + 14, wy)
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawOutono(ctx: CanvasRenderingContext2D, W: number, H: number, t = 0, mouse: Mouse = null) {
  const leaves = [
    { x: 0.15, y: 0.09, rot:  0.3, color: '#FB923C', s: 15, speed: 0.7 },
    { x: 0.58, y: 0.05, rot: -0.5, color: '#F97316', s: 11, speed: 1.0 },
    { x: 0.84, y: 0.24, rot:  0.8, color: '#EA580C', s: 17, speed: 0.6 },
    { x: 0.30, y: 0.48, rot: -0.2, color: '#FCD34D', s: 12, speed: 1.2 },
    { x: 0.72, y: 0.44, rot:  0.6, color: '#DC2626', s: 14, speed: 0.85 },
    { x: 0.92, y: 0.06, rot: -0.8, color: '#F59E0B', s: 10, speed: 1.1 },
    { x: 0.46, y: 0.76, rot:  0.4, color: '#FB923C', s:  9, speed: 0.9 },
    { x: 0.18, y: 0.70, rot: -0.6, color: '#FBBF24', s: 11, speed: 0.75 },
    { x: 0.78, y: 0.78, rot:  1.1, color: '#EA580C', s:  8, speed: 1.3 },
  ]

  leaves.forEach(({ x, y, rot, color, s, speed }, i) => {
    const lx = x * W, ly = y * H
    let pushX = 0, pushY = 0, extraSway = 0
    if (mouse) {
      const mdx = lx - mouse.x, mdy = ly - mouse.y
      const dist = Math.sqrt(mdx * mdx + mdy * mdy)
      const radius = 75
      if (dist < radius && dist > 1) {
        const strength = (1 - dist / radius) ** 2
        pushX = (mdx / dist) * strength * 30
        pushY = (mdy / dist) * strength * 20
        extraSway = strength * 0.5
      }
    }
    const windPhase = t * speed * 0.0005 + i * 1.2
    const sway = Math.sin(windPhase) * 0.18 + extraSway * Math.sin(windPhase * 2 + i)
    const dy   = Math.sin(t * speed * 0.0003 + i) * 2.5
    ctx.save()
    ctx.translate(lx + pushX, ly + dy + pushY)
    ctx.rotate(rot + sway)
    ctx.globalAlpha = 0.6
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.bezierCurveTo( s,     -s * 0.5,  s * 1.2,  s * 0.5, 0,  s)
    ctx.bezierCurveTo(-s * 1.2, s * 0.5, -s,     -s * 0.5, 0, -s)
    ctx.fill()
    ctx.globalAlpha = 0.18
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 0.6
    ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke()
    ctx.restore()
  })
}

type DrawFn = (ctx: CanvasRenderingContext2D, W: number, H: number, t?: number, mouse?: Mouse) => void

const DRAW_FN: Record<Season, DrawFn> = {
  inverno:   drawInverno,
  primavera: drawPrimavera,
  'verão':   drawVerao,
  outono:    drawOutono,
}

const ANIMATED: Partial<Record<Season, true>> = { inverno: true, primavera: true, 'verão': true, outono: true }

// ─── Component ────────────────────────────────────────────────────────────────

export const SeasonDeco = memo(function SeasonDeco({ season, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef<Mouse>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = DRAW_FN[season]
    if (!draw) return

    // Track mouse via document — works even with pointer-events: none on canvas.
    // Coordinates are converted from page space to canvas drawing space.
    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      if (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top  && e.clientY <= rect.bottom
      ) {
        const scaleX = canvas!.width  / rect.width
        const scaleY = canvas!.height / rect.height
        mouseRef.current = {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top)  * scaleY,
        }
      } else {
        mouseRef.current = null
      }
    }

    document.addEventListener('mousemove', onMove)

    if (!ANIMATED[season]) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      draw(ctx, canvas.width, canvas.height)
      return () => document.removeEventListener('mousemove', onMove)
    }

    let rafId: number
    const start = performance.now()

    function frame(now: number) {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      draw(ctx!, canvas!.width, canvas!.height, now - start, mouseRef.current)
      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
    }
  }, [season])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={220}
      className={className}
      aria-hidden
    />
  )
})
