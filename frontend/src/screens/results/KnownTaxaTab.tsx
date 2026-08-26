import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { KnownTaxon } from '../../api/types'
import { EmptyState } from '../../components/ui/EmptyState'
import { SlideOver } from '../../components/ui/SlideOver'
import { Tip } from '../../components/ui/Tip'
import { AT_RISK_STATUSES, CONSERVATION_TONE, isAtRisk } from '../../lib/conservation'
import { formatCount, formatPercent, splitMatchedTaxon } from '../../lib/format'
import { GLOSSARY } from '../../lib/glossary'
import { groupByPhylum, PHYLUM_COLORS } from '../../lib/taxonomy'
import { useResultsContext } from './ResultsLayout'

type SortKey = 'phylum' | 'taxon' | 'identity_score' | 'count'
type SortDir = 'asc' | 'desc'

export function CompositionBar({ rows }: { rows: KnownTaxon[] }) {
  const [mounted, setMounted] = useState(false)
  const byPhylum = useMemo(() => groupByPhylum(rows), [rows])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="mb-6">
      <div className="flex h-6 w-full overflow-hidden rounded-pill border border-border-soft bg-surface-sunk">
        {byPhylum.map((band, i) => (
          <div
            key={band.phylum}
            title={`${band.phylum} — ${band.pct.toFixed(1)}%`}
            style={{
              width: mounted ? `${band.pct}%` : '0%',
              backgroundColor: PHYLUM_COLORS[i % PHYLUM_COLORS.length],
              transition: `width 700ms var(--ease-standard) ${i * 60}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">
          relative sequence abundance
        </span>
        {byPhylum.slice(0, 6).map((band, i) => (
          <span key={band.phylum} className="inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: PHYLUM_COLORS[i % PHYLUM_COLORS.length] }}
            />
            {band.phylum}
          </span>
        ))}
      </div>
    </div>
  )
}

function IdentityBar({ score }: { score: number }) {
  return (
    <div className="relative flex h-6 w-24 items-center overflow-hidden rounded-control">
      <div className="absolute inset-y-0 left-0 bg-seafoam-pale" style={{ width: `${score * 100}%` }} />
      <span className="relative z-10 pl-2 font-mono text-[13px] text-ink">{formatPercent(score)}</span>
    </div>
  )
}

function ConservationBadge({ status }: { status: KnownTaxon['conservation_status'] }) {
  const tone = CONSERVATION_TONE[status]
  return (
    <span className={`inline-flex items-center rounded-pill border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-mono-label ${tone.toneClass}`}>
      {status}
    </span>
  )
}

export function KnownTaxaTab() {
  const { results } = useResultsContext()
  const rows = results?.known_taxa ?? []
  const [searchParams, setSearchParams] = useSearchParams()
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<KnownTaxon | null>(null)
  const [atRiskOnly, setAtRiskOnly] = useState(() => searchParams.get('atRisk') === '1')
  const scrollRef = useRef<HTMLDivElement>(null)

  function toggleAtRiskOnly() {
    setAtRiskOnly((prev) => {
      const next = !prev
      const params = new URLSearchParams(searchParams)
      if (next) params.set('atRisk', '1')
      else params.delete('atRisk')
      setSearchParams(params, { replace: true })
      return next
    })
  }

  const filteredRows = useMemo(
    () => (atRiskOnly ? rows.filter((r) => isAtRisk(r.conservation_status)) : rows),
    [rows, atRiskOnly],
  )

  const sorted = useMemo(() => {
    const withTaxon = filteredRows.map((r) => ({ row: r, split: splitMatchedTaxon(r.matched_taxon) }))
    withTaxon.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'phylum') cmp = a.split.phylum.localeCompare(b.split.phylum)
      else if (sortKey === 'taxon') cmp = a.split.species.localeCompare(b.split.species)
      else if (sortKey === 'identity_score') cmp = a.row.identity_score - b.row.identity_score
      else cmp = a.row.count - b.row.count
      return sortDir === 'asc' ? cmp : -cmp
    })
    return withTaxon
  }, [filteredRows, sortKey, sortDir])

  const rowVirtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 48,
    overscan: 12,
  })

  if (rows.length === 0) {
    return <EmptyState title="No known taxa matched" description="This sample had no reads matched against the reference databases." />
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function SortHeader({ label, sortKeyValue }: { label: string; sortKeyValue: SortKey }) {
    const active = sortKey === sortKeyValue
    return (
      <th className="sticky top-0 z-10 bg-surface-sunk px-3 py-2.5 text-left">
        <button
          type="button"
          onClick={() => toggleSort(sortKeyValue)}
          className="flex items-center gap-1 font-mono text-[12px] uppercase tracking-mono-label text-ink-2"
        >
          {label}
          {active && <span aria-hidden="true">{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </button>
      </th>
    )
  }

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0

  return (
    <div>
      <CompositionBar rows={rows} />

      <div className="mb-4 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 font-body text-[14px] text-ink-2">
          <input type="checkbox" checked={atRiskOnly} onChange={toggleAtRiskOnly} className="accent-coral" />
          At-risk only (VU / EN / CR)
        </label>
        {atRiskOnly && (
          <span className="font-mono text-[12px] text-ink-3">
            {filteredRows.length} of {rows.length} rows
          </span>
        )}
      </div>

      {atRiskOnly && filteredRows.length === 0 ? (
        <EmptyState title="No at-risk taxa" description="None of this sample's known taxa are flagged VU, EN, or CR." />
      ) : (
        <div ref={scrollRef} className="max-h-[560px] overflow-auto rounded-card border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 bg-surface-sunk px-3 py-2.5 text-left font-mono text-[12px] uppercase tracking-mono-label text-ink-2">
                  ASV
                </th>
                <SortHeader label="Phylum" sortKeyValue="phylum" />
                <th className="sticky top-0 z-10 bg-surface-sunk px-3 py-2.5 text-left font-mono text-[12px] uppercase tracking-mono-label text-ink-2">
                  Class
                </th>
                <SortHeader label="Taxon" sortKeyValue="taxon" />
                <SortHeader label="Identity" sortKeyValue="identity_score" />
                <SortHeader label="Count" sortKeyValue="count" />
                <th className="sticky top-0 z-10 bg-surface-sunk px-3 py-2.5 text-left font-mono text-[12px] uppercase tracking-mono-label text-ink-2">
                  Source
                </th>
                <th className="sticky top-0 z-10 bg-surface-sunk px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr aria-hidden="true">
                  <td style={{ height: paddingTop }} colSpan={8} />
                </tr>
              )}
              {virtualRows.map((vRow) => {
                const { row, split } = sorted[vRow.index]
                return (
                  <tr
                    key={row.asv_id}
                    className={vRow.index % 2 === 1 ? 'bg-surface-sunk/50' : undefined}
                    style={{ height: vRow.size }}
                  >
                    <td className="px-3 py-2 font-mono text-[13px] text-ink-2">{row.asv_id}</td>
                    <td className="px-3 py-2 font-body text-[14px] text-ink">{split.phylum}</td>
                    <td className="px-3 py-2 font-body text-[14px] text-ink-2">{split.class}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-[14px] italic text-ink">{split.species}</span>
                        <ConservationBadge status={row.conservation_status} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <IdentityBar score={row.identity_score} />
                    </td>
                    <td className="px-3 py-2 font-mono text-[13px] text-ink-2">{formatCount(row.count)}</td>
                    <td className="px-3 py-2 font-mono text-[12px] text-ink-3">{row.database_source}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-control border border-border px-2 py-1 font-mono text-[11px] text-ink-2 hover:border-teal hover:text-teal"
                      >
                        preview
                      </button>
                    </td>
                  </tr>
                )
              })}
              {paddingBottom > 0 && (
                <tr aria-hidden="true">
                  <td style={{ height: paddingBottom }} colSpan={8} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 font-mono text-[11px] text-ink-3">
        Conservation status ({AT_RISK_STATUSES.join('/')} = at-risk) from a curated reference table, not a live IUCN
        lookup — verify before citing.
        <Tip term="conservation status" definition={GLOSSARY.conservationStatus} />
      </p>

      <SlideOver open={selected !== null} onClose={() => setSelected(null)} title={selected?.asv_id ?? ''}>
        {selected && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Matched taxon</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="font-body text-[15px] italic text-ink">{splitMatchedTaxon(selected.matched_taxon).species}</p>
                <ConservationBadge status={selected.conservation_status} />
              </div>
              <p className="font-body text-[13px] text-ink-2">
                {splitMatchedTaxon(selected.matched_taxon).phylum} &gt; {splitMatchedTaxon(selected.matched_taxon).class}
              </p>
            </div>
            <div className="flex gap-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Identity</p>
                <p className="font-mono text-[18px] text-ink">{formatPercent(selected.identity_score)}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Read count</p>
                <p className="font-mono text-[18px] text-ink">{formatCount(selected.count)}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Source DB</p>
                <p className="font-mono text-[18px] text-ink">{selected.database_source}</p>
              </div>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Sequence preview</p>
              <p className="mt-1 break-all rounded-control bg-surface-sunk p-3 font-mono text-[12px] leading-relaxed text-ink-2">
                {selected.sequence_preview}
              </p>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
