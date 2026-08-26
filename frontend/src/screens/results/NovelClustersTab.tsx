import { useEffect, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { NovelCluster } from '../../api/types'
import { EmptyState } from '../../components/ui/EmptyState'
import { SlideOver } from '../../components/ui/SlideOver'
import { SonarLoader } from '../../components/ui/SonarLoader'
import { formatCount, formatPercent } from '../../lib/format'
import { useReviewLedger, type ReviewDecision } from '../../store/useReviewLedger'

const DECISION_LABEL: Record<ReviewDecision, string> = {
  confirmed: 'Confirmed for review',
  rejected: 'Rejected',
  flagged: 'Flagged',
}

const DECISION_TONE: Record<ReviewDecision, string> = {
  confirmed: 'border-kelp text-kelp',
  rejected: 'border-ink-3 text-ink-3',
  flagged: 'border-sand text-sand',
}

function NoveltyBar({ score }: { score: number }) {
  return (
    <div className="relative flex h-7 w-full max-w-40 items-center overflow-hidden rounded-control border border-border-soft bg-surface-sunk">
      <div className="absolute inset-y-0 left-0 bg-coral" style={{ width: `${score * 100}%` }} />
      <span className="relative z-10 pl-2 font-mono text-[13px] font-medium text-ink mix-blend-normal">
        {formatPercent(score)}
      </span>
    </div>
  )
}

export function NovelClustersTab() {
  const { sampleId = '' } = useParams()
  const [clusters, setClusters] = useState<NovelCluster[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<NovelCluster | null>(null)

  const entries = useReviewLedger((s) => s.entries)
  const setDecision = useReviewLedger((s) => s.setDecision)

  useEffect(() => {
    let cancelled = false
    api
      .getNovelClusters(sampleId)
      .then((c) => {
        if (!cancelled) setClusters(c)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [sampleId])

  if (error) {
    return <div className="rounded-control border border-sand bg-surface px-4 py-3 font-body text-[14px] text-ink">Could not load candidate clusters: {error}</div>
  }
  if (!clusters) return <SonarLoader label="Loading candidate clusters…" />
  if (clusters.length === 0) {
    return <EmptyState title="No candidate clusters" description="Nothing in this sample diverged enough from the reference databases to flag for review." />
  }

  return (
    <div>
      <div className="mb-6 rounded-card border-l-4 border-coral bg-coral-soft px-5 py-4">
        <p className="font-body text-[14px] leading-relaxed text-ink">
          These are <strong>candidate clusters flagged for expert review</strong> — divergent from anything in the
          reference databases, not confirmed new species. Placement and confidence should be verified by a
          taxonomist before any claim is made.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-2">
        {clusters.map((cluster, i) => {
          const decision = entries[cluster.id]?.decision
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => setSelected(cluster)}
              className="hover-lift press-scale reveal-item rounded-card border border-border bg-surface p-5 text-left"
              style={{ boxShadow: 'var(--shadow-card)', '--i': i } as CSSProperties}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-mono text-[15px] font-medium text-ink">{cluster.placeholder_id}</span>
                {decision && (
                  <span className={`rounded-pill border px-2 py-0.5 font-mono text-[11px] ${DECISION_TONE[decision]}`}>
                    {DECISION_LABEL[decision]}
                  </span>
                )}
              </div>

              <div className="mt-3">
                <NoveltyBar score={cluster.novelty_score} />
              </div>

              <p className="mt-3 font-body text-[14px] leading-relaxed text-ink-2">{cluster.rank_prediction}</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] text-ink-3">
                <span>{formatCount(cluster.member_count)} members</span>
                <span>{formatCount(cluster.total_reads)} reads</span>
              </div>
              <p className="mt-1 font-mono text-[12px] text-ink-3">nearest: {cluster.nearest_reference}</p>
            </button>
          )
        })}
      </div>

      <SlideOver open={selected !== null} onClose={() => setSelected(null)} title={selected?.placeholder_id ?? ''}>
        {selected && (
          <div className="flex flex-col gap-5">
            <NoveltyBar score={selected.novelty_score} />

            <div>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Rank prediction</p>
              <p className="mt-1 font-body text-[15px] leading-relaxed text-ink">{selected.rank_prediction}</p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Nearest reference</p>
              <p className="mt-1 font-body text-[14px] text-ink-2">{selected.nearest_reference}</p>
            </div>

            <div className="flex gap-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Members</p>
                <p className="font-mono text-[18px] text-ink">{formatCount(selected.member_count)}</p>
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Reads</p>
                <p className="font-mono text-[18px] text-ink">{formatCount(selected.total_reads)}</p>
              </div>
            </div>

            <div className="border-t border-border-soft pt-4">
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Review (saved on this device)</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDecision(selected.id, 'confirmed')}
                  className="rounded-control border border-kelp px-3 py-2 font-body text-[13px] text-kelp hover:bg-kelp hover:text-shell"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setDecision(selected.id, 'rejected')}
                  className="rounded-control border border-border px-3 py-2 font-body text-[13px] text-ink-2 hover:border-ink-3"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setDecision(selected.id, 'flagged')}
                  className="rounded-control border border-sand px-3 py-2 font-body text-[13px] text-sand hover:bg-sand hover:text-ink"
                >
                  Flag
                </button>
              </div>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  )
}
