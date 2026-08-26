import type { CSSProperties } from 'react'
import { MarineSnowCanvas } from './MarineSnowCanvas'

const TITLE = 'DeepDrift'

export function Act1Surface() {
  return (
    <section className="abyss-deep relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <MarineSnowCanvas />

      <div className="relative z-10">
        <p className="reveal-item font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2" style={{ '--i': 0 } as CSSProperties}>
          CMLRE · Deep-sea eDNA · 18S / COI
        </p>

        <h1 className="mt-4 font-display text-6xl text-ink-inv min-[700px]:text-8xl" aria-label={TITLE}>
          {[...TITLE].map((ch, i) => (
            <span
              key={i}
              className="reveal-item inline-block tracking-display"
              style={{ '--i': i + 1 } as CSSProperties}
              aria-hidden="true"
            >
              {ch}
            </span>
          ))}
        </h1>

        <p
          className="reveal-item mx-auto mt-6 max-w-md font-body text-[17px] leading-relaxed text-ink-inv-2"
          style={{ '--i': TITLE.length + 1 } as CSSProperties}
        >
          DeepDrift reads life out of seawater — matching what the reference databases know, and surfacing what they
          don't as candidates for expert review, not noise.
        </p>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 font-mono text-[11px] uppercase tracking-eyebrow text-ink-inv-2 opacity-60">
        scroll
      </div>
    </section>
  )
}
