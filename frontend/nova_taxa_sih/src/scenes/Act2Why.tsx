import { useRef } from 'react'
import { CountUp } from '../components/ui/CountUp'
import { useInViewOnce } from '../lib/useInViewOnce'

interface StatDef {
  label: string
  value: number | null
  suffix: string
  sourced: boolean
}

/**
 * DeepDrift is a research tool — these figures are not invented. Until a
 * teammate supplies a cited source, the card renders as an explicit
 * placeholder rather than a fabricated number.
 */
const STATS: StatDef[] = [
  { label: "Ocean's share of Earth's habitable space", value: null, suffix: '%', sourced: false },
  { label: 'Deep-sea species estimated still undescribed', value: null, suffix: '%', sourced: false },
  { label: 'Share of atmospheric oxygen from marine organisms', value: null, suffix: '%', sourced: false },
]

function StatCard({ stat, inView }: { stat: StatDef; inView: boolean }) {
  if (!stat.sourced || stat.value === null) {
    return (
      <div className="rounded-card border-2 border-dashed border-coral/60 bg-abyss-2 p-6">
        <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-inv-2">{stat.label}</p>
        <p className="mt-3 font-mono text-3xl text-coral">— % —</p>
        <p className="mt-2 font-mono text-[11px] text-ink-inv-2">Figure needed — add a cited source before shipping.</p>
      </div>
    )
  }
  return (
    <div className="rounded-card border border-abyss-3 bg-abyss-2 p-6">
      <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-inv-2">{stat.label}</p>
      <p className="mt-3 font-mono text-4xl text-seafoam">
        {inView ? <CountUp value={stat.value} decimals={0} suffix={stat.suffix} /> : `0${stat.suffix}`}
      </p>
    </div>
  )
}

export function Act2Why() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInViewOnce(sectionRef)

  return (
    <section className="abyss-deep relative px-6 py-24">
      <div ref={sectionRef} className="mx-auto grid max-w-5xl grid-cols-1 gap-12 min-[900px]:grid-cols-[1.1fr_1fr] min-[900px]:items-center">
        <div>
          <p className="font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2">Why unnamed life still counts</p>
          <p className="mt-4 font-display text-2xl leading-snug text-ink-inv min-[700px]:text-3xl">
            Most of what lives in the deep ocean has never been named. That doesn't make it noise — it makes it
            unmeasured.
          </p>
          <p className="mt-5 max-w-lg font-body text-[16px] leading-relaxed text-ink-inv-2">
            A reference database can only tell you what someone has already catalogued. Everything else gets thrown
            away by pipelines that treat "no match" as failure. DeepDrift keeps it, scores it, and hands it to a
            person to look at — because the gap between known and unknown is exactly where new baselines get missed.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  )
}
