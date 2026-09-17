import { useEffect, useRef } from 'react'

// Cores vibrantes para o confetti
const COLORS = [
  '#f59e0b', '#fbbf24', '#34d399', '#60a5fa',
  '#c084fc', '#f472b6', '#fb923c', '#4ade80',
]

const PARTICLE_COUNT = 140
const DURATION_MS    = 4800

interface Particle {
  x: number; y: number
  vx: number; vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  isCircle: boolean
}

/**
 * Lança uma chuva de confetti canvas-based que dura ~5s e depois desaparece.
 * Respeita prefers-reduced-motion — não renderiza nada se a preferência estiver ativa.
 */
export function BirthdayConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Inicializa partículas — começa fora da tela no topo
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:             Math.random() * window.innerWidth,
      y:             -10 - Math.random() * 300,
      vx:            (Math.random() - 0.5) * 3.5,
      vy:            2.5 + Math.random() * 3,
      color:         COLORS[Math.floor(Math.random() * COLORS.length)],
      size:          5 + Math.random() * 8,
      rotation:      Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.14,
      isCircle:      Math.random() > 0.55,
    }))

    const startTime = performance.now()
    let raf: number

    function draw(now: number) {
      if (!ctx || !canvas) return
      const elapsed  = now - startTime
      const progress = Math.min(elapsed / DURATION_MS, 1)
      // Mantém visível até 70% do tempo, depois fade-out
      const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3

      // Reseta transform antes do clearRect (clearRect é afetado pelo transform atual)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // globalAlpha igual para todas as partículas no frame — atribui uma vez só
      ctx.globalAlpha = alpha

      for (const p of particles) {
        // Física simples: drift + gravidade leve crescente
        p.x  += p.vx
        p.y  += p.vy + progress * 1.5
        p.rotation += p.rotationSpeed
        // Wrap horizontal para dar sensação de densidade contínua
        if (p.x < -20)               p.x = canvas.width + 20
        if (p.x > canvas.width + 20) p.x = -20

        // setTransform em vez de save/translate/rotate/restore — zero operações de pilha
        const cos = Math.cos(p.rotation)
        const sin = Math.sin(p.rotation)
        ctx.setTransform(cos, sin, -sin, cos, p.x, p.y)
        ctx.fillStyle = p.color

        if (p.isCircle) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Retângulo achatado (papel de confetti)
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(draw)
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    // Double-RAF: aguarda a primeira pintada do React antes de iniciar o loop
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(draw) })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ willChange: 'transform' }}
      aria-hidden
    />
  )
}
