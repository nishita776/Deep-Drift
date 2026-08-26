import { useState, useSyncExternalStore } from 'react'
import { api, API_BASE, API_MODE } from '../../api/client'
import { seedCompareDemo } from '../../api/devSeed'
import {
  getMockControlsSnapshot,
  setMockDatasetSize,
  setMockJobOutcome,
  subscribeMockControls,
  type MockDatasetSize,
  type MockJobOutcome,
} from '../../api/mockControls'

const JOB_OUTCOMES: { value: MockJobOutcome; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'failed', label: 'Failed' },
  { value: 'slow', label: 'Slow' },
]

const DATASET_SIZES: { value: MockDatasetSize; label: string }[] = [
  { value: 'normal', label: 'Normal (~8/3)' },
  { value: 'empty', label: 'Empty' },
  { value: 'large', label: 'Large (~500/40)' },
]

type PingState = { status: 'idle' } | { status: 'checking' } | { status: 'ok' } | { status: 'error'; message: string }

/**
 * Dev-only floating panel. Never rendered in production builds.
 * Two jobs: (1) force the mock adapter into failed/slow/empty/large states
 * for the next run, (2) a one-click reachability check against the real
 * backend once VITE_API_MODE=http (§11 handover requirement).
 */
export function DevToolsPanel() {
  const [open, setOpen] = useState(false)
  const [ping, setPing] = useState<PingState>({ status: 'idle' })
  const [seeding, setSeeding] = useState(false)
  const controls = useSyncExternalStore(subscribeMockControls, getMockControlsSnapshot)

  if (!import.meta.env.DEV) return null

  async function runSeedCompareDemo() {
    setSeeding(true)
    try {
      await seedCompareDemo()
    } finally {
      setSeeding(false)
    }
  }

  async function runPing() {
    setPing({ status: 'checking' })
    try {
      const ok = await api.ping()
      setPing(ok ? { status: 'ok' } : { status: 'error', message: 'Backend responded but not OK' })
    } catch (err) {
      setPing({ status: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 font-body text-sm">
      {open && (
        <div className="mb-2 w-72 rounded-card border border-border bg-surface p-4 shadow-card">
          <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Dev tools</p>

          <div className="mt-3">
            <p className="font-mono text-[13px] text-ink-2">
              API mode: <span className="text-ink">{API_MODE}</span>
            </p>
            <p className="mt-1 break-all font-mono text-[11px] text-ink-3">{API_BASE}</p>
            <button
              type="button"
              onClick={runPing}
              className="mt-2 rounded-control border border-border bg-surface-sunk px-3 py-1.5 font-body text-[13px] text-ink hover:border-teal"
            >
              Ping backend
            </button>
            {ping.status === 'checking' && <p className="mt-1 text-[12px] text-ink-3">checking…</p>}
            {ping.status === 'ok' && <p className="mt-1 text-[12px] text-kelp">reachable</p>}
            {ping.status === 'error' && <p className="mt-1 text-[12px] text-coral">unreachable — {ping.message}</p>}
          </div>

          {API_MODE === 'mock' && (
            <>
              <div className="mt-4 border-t border-border-soft pt-3">
                <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">
                  Force next job outcome
                </p>
                <div className="mt-2 flex gap-1">
                  {JOB_OUTCOMES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMockJobOutcome(opt.value)}
                      aria-pressed={controls.jobOutcome === opt.value}
                      className={`rounded-control px-2 py-1 text-[12px] ${
                        controls.jobOutcome === opt.value
                          ? 'bg-teal text-shell'
                          : 'border border-border bg-surface-sunk text-ink-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">
                  Force next dataset size
                </p>
                <div className="mt-2 flex gap-1">
                  {DATASET_SIZES.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMockDatasetSize(opt.value)}
                      aria-pressed={controls.datasetSize === opt.value}
                      className={`rounded-control px-2 py-1 text-[12px] ${
                        controls.datasetSize === opt.value
                          ? 'bg-coral text-shell'
                          : 'border border-border bg-surface-sunk text-ink-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-border-soft pt-3">
                <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">Compare demo (D4)</p>
                <button
                  type="button"
                  onClick={runSeedCompareDemo}
                  disabled={seeding}
                  className="mt-2 rounded-control border border-border bg-surface-sunk px-3 py-1.5 font-body text-[13px] text-ink hover:border-teal disabled:opacity-50"
                >
                  {seeding ? 'Seeding…' : 'Seed 2 done + 1 stuck sample'}
                </button>
                <p className="mt-1 font-mono text-[11px] text-ink-3">Adds samples for Compare's null-biodiversity row.</p>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-pill border border-border bg-ink px-4 py-2 font-mono text-[12px] uppercase tracking-mono-label text-shell shadow-card"
      >
        {open ? 'Close dev tools' : 'Dev tools'}
      </button>
    </div>
  )
}
