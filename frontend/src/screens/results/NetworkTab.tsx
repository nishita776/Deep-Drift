import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import { formatCount, formatPercent } from '../../lib/format'
import { PHYLUM_COLORS } from '../../lib/taxonomy'
import { useResultsContext } from './ResultsLayout'
import { ancestorIds, buildNetworkLayout, subtreeIds, type NetworkNode } from './networkLayout'

const VIEW = 700
const CENTER = VIEW / 2

function colorForPhylum(phylum: string | null, phylumColorMap: Map<string, string>): string {
  if (!phylum) return 'var(--ink-3)'
  return phylumColorMap.get(phylum) ?? 'var(--ink-3)'
}

export function NetworkTab() {
  const { results, novelClusters } = useResultsContext()
  const reducedMotion = usePrefersReducedMotion()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const knownTaxa = results?.known_taxa ?? []
  const clusters = novelClusters ?? []

  const layout = useMemo(() => buildNetworkLayout(knownTaxa, clusters, CENTER, CENTER), [knownTaxa, clusters])

  const [revealed, setRevealed] = useState(reducedMotion)
  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true)
      return
    }
    setRevealed(false)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)))
    return () => cancelAnimationFrame(raf)
  }, [layout, reducedMotion])

  const phylumColorMap = useMemo(() => {
    const map = new Map<string, string>()
    let i = 0
    for (const node of layout.nodes) {
      if (node.kind === 'phylum' && !map.has(node.label)) {
        map.set(node.label, PHYLUM_COLORS[i % PHYLUM_COLORS.length])
        i++
      }
    }
    return map
  }, [layout])

  const isolatedSet = useMemo(() => {
    if (!selectedId) return null
    const sub = subtreeIds(layout.nodes, selectedId)
    const anc = ancestorIds(layout.nodes, selectedId)
    return new Set([...sub, ...anc])
  }, [selectedId, layout])

  const searchMatches = useMemo(() => {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    return new Set(layout.nodes.filter((n) => n.label.toLowerCase().includes(q)).map((n) => n.id))
  }, [query, layout])

  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout])
  const detailNode = (hoveredId && nodeById.get(hoveredId)) || (selectedId && nodeById.get(selectedId)) || null

  if (knownTaxa.length === 0 && clusters.length === 0) {
    return <EmptyState title="Nothing to map" description="No known taxa or candidate clusters to build a network from." />
  }

  function dimFor(id: string): number {
    if (isolatedSet && !isolatedSet.has(id)) return 0.12
    if (searchMatches && !searchMatches.has(id)) return 0.2
    return 1
  }

  function labelVisible(node: NetworkNode): boolean {
    if (node.kind === 'phylum' || node.kind === 'cluster') return true
    if (hoveredId === node.id || selectedId === node.id) return true
    if (searchMatches?.has(node.id)) return true
    return false
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-[14px] text-ink-2">
          Phylum → Class → Species from known taxa. Coral dashed nodes are candidate-novel clusters, attached near
          their nearest reference — never confirmed species.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="rounded-control border border-border bg-surface px-3 py-1.5 font-body text-[13px] text-ink outline-none focus-visible:border-teal"
          />
          <button
            type="button"
            onClick={() => {
              setSelectedId(null)
              setQuery('')
            }}
            className="rounded-control border border-border px-3 py-1.5 font-body text-[13px] text-ink-2 hover:border-teal hover:text-teal"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-[1fr_240px]">
        <div className="rounded-card border border-border bg-surface p-2" style={{ boxShadow: 'var(--shadow-card)' }}>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full" role="img" aria-label="Taxonomic network diagram">
            {layout.edges.map((edge) => {
              const from = nodeById.get(edge.fromId)
              const to = nodeById.get(edge.toId)
              if (!from || !to) return null
              const opacity = Math.min(dimFor(edge.fromId), dimFor(edge.toId))
              return (
                <line
                  key={edge.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={edge.isClusterEdge ? 'var(--coral)' : colorForPhylum(to.phylum, phylumColorMap)}
                  strokeWidth={edge.isClusterEdge ? 1.5 : 1.2}
                  strokeDasharray={edge.isClusterEdge ? '4 3' : undefined}
                  opacity={!revealed ? 0 : reducedMotion ? opacity * 0.55 : opacity * 0.5}
                  style={
                    reducedMotion
                      ? undefined
                      : ({
                          transition: `opacity 500ms var(--ease-standard) ${Math.min(to.depth, 3) * 90}ms`,
                        } as CSSProperties)
                  }
                />
              )
            })}

            {layout.nodes.map((node) => {
              if (node.kind === 'root') return null
              const isCluster = node.kind === 'cluster'
              const color = isCluster ? 'var(--coral)' : colorForPhylum(node.phylum, phylumColorMap)
              const opacity = dimFor(node.id)
              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId((prev) => (prev === node.id ? null : prev))}
                  onClick={() => setSelectedId((prev) => (prev === node.id ? null : node.id))}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.r}
                    fill={isCluster ? 'var(--surface)' : color}
                    stroke={color}
                    strokeWidth={isCluster ? 2 : 1}
                    strokeDasharray={isCluster ? '3 2' : undefined}
                    opacity={opacity}
                    style={
                      reducedMotion
                        ? undefined
                        : ({
                            transformBox: 'fill-box',
                            transformOrigin: 'center',
                            transform: `scale(${revealed ? 1 : 0})`,
                            transition: `opacity var(--duration-standard) var(--ease-standard), transform 500ms var(--ease-standard) ${Math.min(node.depth, 3) * 90}ms`,
                          } as CSSProperties)
                    }
                  />
                  {labelVisible(node) && (
                    <text
                      x={node.x}
                      y={node.y + node.r + 11}
                      textAnchor="middle"
                      fontFamily="var(--font-mono)"
                      fontSize={node.kind === 'phylum' ? 11 : 9.5}
                      fill={selectedId === node.id || searchMatches?.has(node.id) ? 'var(--sand)' : 'var(--ink-2)'}
                      opacity={opacity}
                    >
                      {node.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="rounded-card border border-border bg-surface p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Detail</p>
          {!detailNode && <p className="mt-2 font-body text-[13px] text-ink-3">Hover or click a node.</p>}
          {detailNode && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="font-mono text-[13px] text-ink">{detailNode.label}</p>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">{detailNode.kind}</p>
              {detailNode.phylum && <p className="font-body text-[12px] text-ink-2">Phylum: {detailNode.phylum}</p>}
              <p className="font-mono text-[12px] text-ink-2">{formatCount(detailNode.readCount)} reads</p>
              {detailNode.kind === 'cluster' && detailNode.cluster && (
                <>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-mono-label text-coral">Candidate — not a confirmed species</p>
                  <p className="font-mono text-[12px] text-ink-2">novelty {formatPercent(detailNode.cluster.novelty_score)}</p>
                  <p className="font-body text-[12px] leading-relaxed text-ink-2">{detailNode.cluster.rank_prediction}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
