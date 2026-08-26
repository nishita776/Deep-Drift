import { useEffect, useState } from 'react'
import { api, API_MODE } from '../../api/client'

type ConnState = 'checking' | 'reachable' | 'unreachable'

const RECHECK_INTERVAL_MS = 45000

/**
 * D1 — API mode visibility. Always rendered (never dev-gated), unlike the
 * DevTools panel. Mock mode gets an unmissable warning; http mode gets a
 * live reachability indicator so a dead backend is obvious, not silent.
 */
export function ApiModeBadge() {
  const [state, setState] = useState<ConnState>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (API_MODE !== 'http') return
    let cancelled = false

    async function check() {
      setState('checking')
      try {
        const ok = await api.ping()
        if (cancelled) return
        setState(ok ? 'reachable' : 'unreachable')
        setError(ok ? null : 'Backend responded but was not OK')
      } catch (err) {
        if (cancelled) return
        setState('unreachable')
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    check()
    const interval = setInterval(check, RECHECK_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (API_MODE === 'mock') {
    return (
      <div
        className="mb-3 flex items-center justify-center gap-1.5 rounded-pill border border-sand bg-sand px-3 py-1.5 font-mono text-[11px] uppercase tracking-mono-label text-ink min-[900px]:justify-start"
        title="Running on the mock adapter — no live backend is connected."
      >
        <span aria-hidden="true">●</span> Mock data
      </div>
    )
  }

  const toneClass =
    state === 'reachable' ? 'border-kelp text-kelp' : state === 'unreachable' ? 'border-coral text-coral' : 'border-border-soft text-ink-3'

  return (
    <div className="mb-3 flex flex-col gap-1">
      <div
        className={`flex items-center justify-center gap-1.5 rounded-pill border bg-surface-sunk px-3 py-1.5 font-mono text-[11px] uppercase tracking-mono-label min-[900px]:justify-start ${toneClass}`}
      >
        <span aria-hidden="true">●</span>
        {state === 'checking' && 'Checking backend…'}
        {state === 'reachable' && 'Backend reachable'}
        {state === 'unreachable' && 'Backend unreachable'}
      </div>
      {state === 'unreachable' && error && (
        <p className="break-all px-1 font-mono text-[10px] leading-snug text-ink-3">{error}</p>
      )}
    </div>
  )
}
