import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatCount, formatPercent } from '../../lib/format'
import { groupByPhylumClass } from '../../lib/taxonomy'
import { useResultsContext } from './ResultsLayout'

interface RGB {
  r: number
  g: number
  b: number
}

function hexToRgb(hex: string): RGB {
  const clean = hex.trim().replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const int = parseInt(full, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  }
}

function rgbToCss({ r, g, b }: RGB): string {
  return `rgb(${r}, ${g}, ${b})`
}

/** 3-stop scale (pale -> teal -> deep) interpolated from tokens.css at runtime — never hardcoded. */
function useHeatmapScale() {
  const [stops, setStops] = useState<RGB[] | null>(null)

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const pale = style.getPropertyValue('--seafoam-pale').trim() || '#D7EDE6'
    const mid = style.getPropertyValue('--teal').trim() || '#0E7C86'
    const deep = style.getPropertyValue('--teal-deep').trim() || '#075A66'
    setStops([hexToRgb(pale), hexToRgb(mid), hexToRgb(deep)])
  }, [])

  return function colorFor(t: number): string {
    if (!stops) return 'var(--surface-sunk)'
    const clamped = Math.max(0, Math.min(1, t))
    if (clamped <= 0.5) return rgbToCss(lerpRgb(stops[0], stops[1], clamped * 2))
    return rgbToCss(lerpRgb(stops[1], stops[2], (clamped - 0.5) * 2))
  }
}

export function HeatmapTab() {
  const { results } = useResultsContext()
  const rows = results?.known_taxa ?? []
  const colorFor = useHeatmapScale()
  const [hovered, setHovered] = useState<{ phylum: string; class: string; readCount: number } | null>(null)

  const cells = useMemo(() => groupByPhylumClass(rows), [rows])

  const { phyla, classes, cellMap, maxCount, minCount, grandTotal } = useMemo(() => {
    const phylumTotals = new Map<string, number>()
    const classTotals = new Map<string, number>()
    const map = new Map<string, number>()
    let max = 0
    let min = Infinity
    let total = 0
    for (const cell of cells) {
      map.set(`${cell.phylum}::${cell.class}`, cell.readCount)
      phylumTotals.set(cell.phylum, (phylumTotals.get(cell.phylum) ?? 0) + cell.readCount)
      classTotals.set(cell.class, (classTotals.get(cell.class) ?? 0) + cell.readCount)
      max = Math.max(max, cell.readCount)
      min = Math.min(min, cell.readCount)
      total += cell.readCount
    }
    const sortedPhyla = [...phylumTotals.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p)
    const sortedClasses = [...classTotals.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
    return { phyla: sortedPhyla, classes: sortedClasses, cellMap: map, maxCount: max, minCount: min === Infinity ? 0 : min, grandTotal: total || 1 }
  }, [cells])

  if (rows.length === 0) {
    return <EmptyState title="No known taxa to map" description="This sample had no reads matched against the reference databases." />
  }

  return (
    <div>
      <p className="mb-4 font-body text-[14px] text-ink-2">
        Read-count intensity by phylum (rows) and class (columns). Hover a cell for the exact count and share of total.
      </p>

      <div className="overflow-x-auto rounded-card border border-border p-4">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface px-2 py-1" />
              {classes.map((c) => (
                <th
                  key={c}
                  className="px-2 py-1 text-left font-mono text-[11px] uppercase tracking-mono-label text-ink-2"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 90 }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phyla.map((p) => (
              <tr key={p}>
                <th className="sticky left-0 z-10 whitespace-nowrap bg-surface px-2 py-1 text-right font-mono text-[11px] uppercase tracking-mono-label text-ink-2">
                  {p}
                </th>
                {classes.map((c) => {
                  const count = cellMap.get(`${p}::${c}`)
                  const t = count ? (count - minCount) / Math.max(1, maxCount - minCount) : 0
                  return (
                    <td key={c} className="p-0.5">
                      <div
                        onMouseEnter={() => (count ? setHovered({ phylum: p, class: c, readCount: count }) : undefined)}
                        onMouseLeave={() => setHovered(null)}
                        className="h-9 w-9 rounded-control"
                        style={{ backgroundColor: count ? colorFor(t) : 'var(--surface-sunk)' }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div
          className="rounded-control border border-border bg-surface px-3 py-2 font-mono text-[12px] text-ink-2"
          aria-live="polite"
          style={{ minHeight: 36 }}
        >
          {hovered ? (
            <>
              {hovered.phylum} / {hovered.class} — {formatCount(hovered.readCount)} reads (
              {formatPercent(hovered.readCount / grandTotal)})
            </>
          ) : (
            'Hover a cell for detail'
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ink-3">{formatCount(minCount)}</span>
          <div
            className="h-3 w-32 rounded-pill border border-border-soft"
            style={{ background: 'linear-gradient(90deg, var(--seafoam-pale), var(--teal), var(--teal-deep))' }}
          />
          <span className="font-mono text-[11px] text-ink-3">{formatCount(maxCount)} reads</span>
        </div>
      </div>
    </div>
  )
}
