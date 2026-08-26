import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

interface Particle {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  opacity: number
}

/** Ambient marine-snow drift for the homepage hero only (§6 Act 1, motion-budget exempt). */
export function MarineSnowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dotColor = getComputedStyle(document.documentElement).getPropertyValue('--seafoam').trim() || '#7FD1C1'
    let particles: Particle[] = []
    let raf = 0
    let lastFrame = 0

    function seed() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      const count = w < 640 ? 26 : 64
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        speed: 5 + Math.random() * 12,
        drift: Math.random() * Math.PI * 2,
        opacity: 0.12 + Math.random() * 0.3,
      }))
    }

    function frame(ts: number) {
      raf = requestAnimationFrame(frame)
      if (ts - lastFrame < 16) return // cap ~60fps
      lastFrame = ts
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas!.clientWidth
      const h = canvas!.clientHeight
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx!.clearRect(0, 0, w, h)
      ctx!.fillStyle = dotColor
      for (const p of particles) {
        p.y += p.speed / 60
        p.x += Math.sin(p.y * 0.02 + p.drift) * 0.12
        if (p.y - p.r > h) {
          p.y = -4
          p.x = Math.random() * w
        }
        ctx!.globalAlpha = p.opacity
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    seed()
    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', seed)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', seed)
    }
  }, [reducedMotion])

  if (reducedMotion) return null
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
