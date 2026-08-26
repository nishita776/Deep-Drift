import type { ReactNode } from 'react'

type Tone = 'neutral' | 'teal' | 'coral' | 'sand' | 'kelp'

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'border-border bg-surface-sunk text-ink-2',
  teal: 'border-transparent bg-seafoam-pale text-teal-deep',
  coral: 'border-transparent bg-coral-soft text-coral',
  sand: 'border-sand bg-surface-sunk text-ink-2',
  kelp: 'border-kelp bg-surface-sunk text-kelp',
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill border px-2.5 py-1 font-mono text-[13px] tracking-mono-label ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}
