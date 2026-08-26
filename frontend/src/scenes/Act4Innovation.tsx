import { useRef, type ComponentType } from 'react'
import { useInViewOnce } from '../lib/useInViewOnce'

interface Panel {
  number: string
  title: string
  body: string
  coral?: boolean
}

const PANELS: Panel[] = [
  {
    number: '01',
    title: 'Database-Independent Discovery',
    body: "Reads absent from SILVA, PR2 and BOLD aren't discarded — they're routed to candidate-novel taxa.",
  },
  {
    number: '02',
    title: 'Calibrated, Defensible Novelty',
    body: 'Clusters receive calibrated confidence scores and placeholder IDs, without ever claiming a new species.',
    coral: true,
  },
  {
    number: '03',
    title: 'Compute-Aware Design',
    body: 'Embedding and clustering run only on unassigned reads, reducing cost versus running QIIME2/BLAST across everything.',
  },
]

function ForkMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--seafoam)" strokeWidth="1.5" aria-hidden="true">
      <path d="M24 6v14" strokeLinecap="round" />
      <path d="M24 20c0 6-10 8-10 16M24 20c0 6 10 8 10 16" strokeLinecap="round" />
      <circle cx="24" cy="6" r="2" />
      <circle cx="14" cy="38" r="2" />
      <circle cx="34" cy="38" r="2" />
    </svg>
  )
}

function CalibrationMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--seafoam)" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 34a16 16 0 0 1 32 0" strokeLinecap="round" />
      <path d="M12 34v3M20 21.5l-.6 3M28 21.5l.6 3M36 34v3" strokeLinecap="round" />
      <path d="M24 34 L31 24" strokeLinecap="round" />
      <circle cx="24" cy="34" r="2" />
    </svg>
  )
}

function FunnelMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--seafoam)" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 10h32l-11 16v12l-10 4V26z" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="24" cy="9" r="1.4" fill="var(--seafoam)" stroke="none" />
    </svg>
  )
}

const MARKS = [ForkMark, CalibrationMark, FunnelMark]

function InnovationPanel({ panel, index, Mark }: { panel: Panel; index: number; Mark: ComponentType }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(ref)

  return (
    <div
      ref={ref}
      className={`rounded-card border p-6 transition-all ${panel.coral ? 'border-coral/50 bg-abyss-2' : 'border-abyss-3 bg-abyss-2'}`}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(16px)',
        transitionDuration: 'var(--duration-standard)',
        transitionTimingFunction: 'var(--ease-standard)',
        transitionDelay: `${index * 90}ms`,
      }}
    >
      <Mark />
      <p className={`mt-4 font-mono text-[12px] uppercase tracking-eyebrow ${panel.coral ? 'text-coral' : 'text-ink-inv-2'}`}>
        {panel.number}
      </p>
      <h3 className="mt-1 font-display text-xl text-ink-inv">{panel.title}</h3>
      <p className="mt-3 font-body text-[15px] leading-relaxed text-ink-inv-2">{panel.body}</p>
      {panel.number === '03' && (
        <p className="mt-4 rounded-control border border-dashed border-coral/50 px-3 py-2 font-mono text-[12px] text-coral">
          — pending measurement — add a measured comparison before shipping.
        </p>
      )}
    </div>
  )
}

export function Act4Innovation() {
  return (
    <section className="abyss-deep px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2">Innovation &amp; uniqueness</p>
        <h2 className="mt-2 max-w-2xl font-display text-3xl text-ink-inv min-[700px]:text-4xl">
          What makes this different from running a standard pipeline.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-6 min-[800px]:grid-cols-3">
          {PANELS.map((panel, i) => (
            <InnovationPanel key={panel.number} panel={panel} index={i} Mark={MARKS[i]} />
          ))}
        </div>
      </div>
    </section>
  )
}
