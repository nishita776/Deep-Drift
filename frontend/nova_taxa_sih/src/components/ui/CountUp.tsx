import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

export function CountUp({
  value,
  decimals = 0,
  durationMs = 900,
  suffix = '',
}: {
  value: number
  decimals?: number
  durationMs?: number
  suffix?: string
}) {
  const reducedMotion = usePrefersReducedMotion()
  const [display, setDisplay] = useState(reducedMotion ? value : 0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value)
      return
    }
    startRef.current = null
    let raf: number
    function tick(ts: number) {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - (1 - t) ** 3
      setDisplay(value * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs, reducedMotion])

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  )
}
