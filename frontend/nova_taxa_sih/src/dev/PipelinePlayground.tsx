import { useState } from 'react'
import { PipelineVisual } from '../components/pipeline/PipelineVisual'

/** Scratch verification route for Phase 3 — progress driven entirely by the slider, never scroll. */
export function PipelinePlayground() {
  const [progress, setProgress] = useState(0.4)
  const [variant, setVariant] = useState<'light' | 'dark'>('light')

  return (
    <div
      className={variant === 'dark' ? 'min-h-svh bg-abyss p-8' : 'min-h-svh bg-shell p-8'}
      style={{ transition: 'background-color var(--duration-standard) var(--ease-standard)' }}
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Phase 3 · Pipeline verification</p>
        <h1 className={`font-display text-3xl ${variant === 'dark' ? 'text-ink-inv' : 'text-ink'}`}>Pipeline visual</h1>

        <div className="mt-6 flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-80"
            aria-label="Pipeline progress"
          />
          <span className={`font-mono text-sm ${variant === 'dark' ? 'text-ink-inv-2' : 'text-ink-2'}`}>
            {Math.round(progress * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setVariant((v) => (v === 'light' ? 'dark' : 'light'))}
            className="rounded-control border border-border bg-surface px-3 py-1.5 font-body text-sm text-ink"
          >
            Toggle variant ({variant})
          </button>
        </div>

        <div className={`mt-10 rounded-card p-8 ${variant === 'dark' ? 'bg-abyss-2' : 'border border-border bg-surface shadow-card'}`}>
          <PipelineVisual progress={progress} variant={variant} />
        </div>
      </div>
    </div>
  )
}
