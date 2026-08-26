import { curveMonotoneX, line as d3line } from 'd3-shape'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import type { CompareResponse } from '../api/types'
import { EmptyState } from '../components/ui/EmptyState'
import { Pill } from '../components/ui/Pill'
import { Reveal } from '../components/ui/Reveal'
import { SonarLoader } from '../components/ui/SonarLoader'
import { formatCount } from '../lib/format'
import { useSampleStore } from '../store/useSampleStore'

const SERIES_COLORS = ['var(--teal)', 'var(--kelp)', 'var(--sand)', 'var(--teal-deep)', 'var(--seafoam)', 'var(--ink-2)']

const CHART_W = 720
const CHART_H = 300
const MARGIN = { top: 16, right: 20, bottom: 40, left: 48 }

export function Compare() {
  const samples = useSampleStore((s) => s.samples)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [data, setData] = useState<CompareResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedIds.length === 0) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    api
      .compareSamples(selectedIds)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedIds])

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const seriesWithCurves = useMemo(() => {
    if (!data) return []
    return selectedIds
      .map((id, i) => ({ id, color: SERIES_COLORS[i % SERIES_COLORS.length], entry: data[id] }))
      .filter((s) => s.entry?.biodiversity)
  }, [data, selectedIds])

  const maxDepth = Math.max(1, ...seriesWithCurves.flatMap((s) => s.entry!.biodiversity!.rarefaction_curve.depths))
  const maxRichness = Math.max(1, ...seriesWithCurves.flatMap((s) => s.entry!.biodiversity!.rarefaction_curve.richness))
  const innerW = CHART_W - MARGIN.left - MARGIN.right
  const innerH = CHART_H - MARGIN.top - MARGIN.bottom
  const xScale = (d: number) => MARGIN.left + (d / maxDepth) * innerW
  const yScale = (r: number) => MARGIN.top + innerH - (r / maxRichness) * innerH
  const lineGen = d3line<[number, number]>().curve(curveMonotoneX)

  if (samples.length === 0) {
    return (
      <div className="marine-snow min-h-svh px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Compare</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Compare samples</h1>
          <EmptyState title="Nothing to compare yet" description="Upload and run at least two samples to compare their biodiversity metrics." />
        </div>
      </div>
    )
  }

  return (
    <div className="marine-snow min-h-svh px-6 py-10 min-[900px]:px-10">
      <div className="mx-auto max-w-5xl">
        <Reveal index={0}>
          <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Compare</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Compare samples</h1>
        </Reveal>

        <Reveal index={1} className="mt-6">
          <div className="flex flex-wrap gap-2">
            {samples.map((s) => (
              <label
                key={s.sampleId}
                className={`hover-lift press-scale flex cursor-pointer items-center gap-2 rounded-pill border px-3 py-1.5 font-body text-[14px] ${
                  selectedIds.includes(s.sampleId) ? 'border-teal bg-seafoam-pale text-teal-deep' : 'border-border bg-surface text-ink-2'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(s.sampleId)}
                  onChange={() => toggle(s.sampleId)}
                  className="sr-only"
                />
                {s.name}
              </label>
            ))}
          </div>
        </Reveal>

        {loading && <SonarLoader label="Comparing…" />}

        {data && selectedIds.length > 0 && !loading && (
          <Reveal index={2} className="mt-8">
            <div className="rounded-card border border-border bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">Rarefaction curves</p>
              {seriesWithCurves.length === 0 ? (
                <p className="mt-4 font-body text-[14px] text-ink-3">None of the selected samples have finished analysis yet.</p>
              ) : (
                <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="mt-4 w-full" style={{ maxWidth: CHART_W }}>
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const val = Math.round(maxRichness * t)
                    return (
                      <g key={t}>
                        <line x1={MARGIN.left} x2={CHART_W - MARGIN.right} y1={yScale(val)} y2={yScale(val)} stroke="var(--border-soft)" strokeWidth={1} />
                        <text x={MARGIN.left - 8} y={yScale(val) + 4} textAnchor="end" fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-3)">
                          {val}
                        </text>
                      </g>
                    )
                  })}
                  {seriesWithCurves.map((s) => {
                    const curve = s.entry!.biodiversity!.rarefaction_curve
                    const points: [number, number][] = curve.depths.map((d, i) => [xScale(d), yScale(curve.richness[i])])
                    return <path key={s.id} d={lineGen(points) ?? ''} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" />
                  })}
                  <text x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill="var(--ink-3)">
                    sequencing depth
                  </text>
                </svg>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {seriesWithCurves.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-2">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.entry!.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-card border border-border">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-sunk">
                    <th className="px-3 py-2.5 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Sample</th>
                    <th className="px-3 py-2.5 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Status</th>
                    <th className="px-3 py-2.5 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Shannon</th>
                    <th className="px-3 py-2.5 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Simpson</th>
                    <th className="px-3 py-2.5 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Richness</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedIds.map((id) => {
                    const entry = data[id]
                    if (!entry) return null
                    const ready = entry.biodiversity !== null
                    return (
                      <tr key={id} className={ready ? undefined : 'opacity-50'}>
                        <td className="px-3 py-2.5 font-body text-[14px] text-ink">{entry.name}</td>
                        <td className="px-3 py-2.5">
                          {ready ? <Pill tone="teal">{entry.status}</Pill> : <Pill tone="sand">not yet analysed</Pill>}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[13px] text-ink-2">{entry.biodiversity ? entry.biodiversity.shannon.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[13px] text-ink-2">{entry.biodiversity ? entry.biodiversity.simpson.toFixed(2) : '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-[13px] text-ink-2">{entry.biodiversity ? formatCount(entry.biodiversity.richness) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}
