import { curveMonotoneX, line as d3line } from 'd3-shape'
import { useEffect, useRef, useState } from 'react'
import type { BiodiversityMetrics } from '../../api/types'
import { CountUp } from '../../components/ui/CountUp'
import { SonarLoader } from '../../components/ui/SonarLoader'
import { Tip } from '../../components/ui/Tip'
import { formatCount } from '../../lib/format'
import { GLOSSARY } from '../../lib/glossary'
import { useResultsContext } from './ResultsLayout'

const CHART_W = 660
const CHART_H = 280
const MARGIN = { top: 16, right: 20, bottom: 40, left: 48 }

function RarefactionChart({ curve }: { curve: BiodiversityMetrics['rarefaction_curve'] }) {
  const pathRef = useRef<SVGPathElement>(null)
  const [drawn, setDrawn] = useState(false)
  const [length, setLength] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const innerW = CHART_W - MARGIN.left - MARGIN.right
  const innerH = CHART_H - MARGIN.top - MARGIN.bottom
  const maxDepth = Math.max(1, ...curve.depths)
  const maxRichness = Math.max(1, ...curve.richness)

  const xScale = (d: number) => MARGIN.left + (d / maxDepth) * innerW
  const yScale = (r: number) => MARGIN.top + innerH - (r / maxRichness) * innerH

  const points: [number, number][] = curve.depths.map((d, i) => [xScale(d), yScale(curve.richness[i])])
  const pathD = d3line().curve(curveMonotoneX)(points) ?? ''

  useEffect(() => {
    setDrawn(false)
    const el = pathRef.current
    if (!el) return
    const len = el.getTotalLength()
    setLength(len)
    const raf = requestAnimationFrame(() => setDrawn(true))
    return () => cancelAnimationFrame(raf)
  }, [pathD])

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = CHART_W / rect.width
    const mouseX = (e.clientX - rect.left) * scaleX
    let closest = 0
    let closestDist = Infinity
    points.forEach(([x], i) => {
      const dist = Math.abs(x - mouseX)
      if (dist < closestDist) {
        closestDist = dist
        closest = i
      }
    })
    setHoverIdx(closest)
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxRichness * t))

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="w-full"
      style={{ maxWidth: CHART_W }}
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
      role="img"
      aria-label="Rarefaction curve: observed richness by sequencing depth"
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={MARGIN.left} x2={CHART_W - MARGIN.right} y1={yScale(t)} y2={yScale(t)} stroke="var(--border-soft)" strokeWidth={1} />
          <text x={MARGIN.left - 8} y={yScale(t) + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-3)">
            {t}
          </text>
        </g>
      ))}

      <path ref={pathRef} d={pathD} fill="none" stroke="var(--teal)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={length}
        strokeDashoffset={drawn ? 0 : length}
        style={{ transition: 'stroke-dashoffset 1100ms var(--ease-standard)' }}
      />

      {hoverIdx !== null && (
        <>
          <line x1={points[hoverIdx][0]} x2={points[hoverIdx][0]} y1={MARGIN.top} y2={CHART_H - MARGIN.bottom} stroke="var(--coral)" strokeWidth={1} strokeDasharray="3 3" />
          <circle cx={points[hoverIdx][0]} cy={points[hoverIdx][1]} r={4} fill="var(--coral)" />
          <g transform={`translate(${Math.min(points[hoverIdx][0] + 10, CHART_W - 150)}, ${MARGIN.top + 4})`}>
            <rect width={140} height={38} rx={6} fill="var(--ink)" opacity={0.92} />
            <text x={8} y={16} fontFamily="var(--font-mono)" fontSize={11} fill="var(--shell)">
              depth {formatCount(curve.depths[hoverIdx])}
            </text>
            <text x={8} y={30} fontFamily="var(--font-mono)" fontSize={11} fill="var(--shell)">
              richness {curve.richness[hoverIdx]}
            </text>
          </g>
        </>
      )}

      <text x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} letterSpacing="0.04em" fill="var(--ink-3)">
        sequencing depth
      </text>
      <text
        x={-CHART_H / 2}
        y={12}
        textAnchor="middle"
        transform="rotate(-90)"
        fontFamily="var(--font-mono)"
        fontSize={11}
        letterSpacing="0.04em"
        fill="var(--ink-3)"
      >
        observed richness
      </text>
    </svg>
  )
}

export function StatCard({ label, value, decimals, tip, description }: { label: string; value: number; decimals: number; tip?: string; description: string }) {
  return (
    <div className="rounded-card border border-border bg-surface p-6" style={{ boxShadow: 'var(--shadow-card), var(--shadow-inset-top)' }}>
      <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">
        {label}
        {tip && <Tip term={label} definition={tip} />}
      </p>
      <p className="mt-2 font-mono text-4xl text-ink">
        <CountUp value={value} decimals={decimals} />
      </p>
      <p className="mt-2 font-body text-[13px] leading-relaxed text-ink-2">{description}</p>
    </div>
  )
}

export function BiodiversityProcessingState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center" aria-live="polite">
      <span className="sonar-sweep" aria-hidden="true" />
      <p className="font-body text-[15px] text-ink-2">Still processing — biodiversity metrics aren't ready yet.</p>
      <p className="font-mono text-[12px] text-ink-3">This updates automatically once the pipeline finishes.</p>
    </div>
  )
}

export function BiodiversityTab() {
  const { biodiversity: data, biodiversityState, biodiversityError } = useResultsContext()

  if (biodiversityState === 'error') {
    return <div className="rounded-control border border-sand bg-surface px-4 py-3 font-body text-[14px] text-ink">Could not load biodiversity metrics: {biodiversityError}</div>
  }

  if (biodiversityState === 'loading') {
    return <SonarLoader label="Loading biodiversity metrics…" />
  }

  if (biodiversityState === 'processing' || !data) {
    return <BiodiversityProcessingState />
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-3">
        <StatCard label="Shannon" value={data.shannon} decimals={2} description="Higher means more species, more evenly represented — not just more reads." />
        <StatCard label="Simpson" value={data.simpson} decimals={2} description="Probability two random reads belong to different taxa. Closer to 1 means more diverse." />
        <StatCard
          label="Richness"
          value={data.richness}
          decimals={0}
          tip={GLOSSARY.rarefaction}
          description="The count of distinct taxa and candidate clusters detected in this sample."
        />
      </div>

      <div className="mt-8 rounded-card border border-border bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">
          Rarefaction curve
          <Tip term="rarefaction" definition={GLOSSARY.rarefaction} />
        </p>
        <div className="mt-4">
          <RarefactionChart curve={data.rarefaction_curve} />
        </div>
      </div>
    </div>
  )
}
