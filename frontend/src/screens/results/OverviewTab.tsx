import { Link } from 'react-router-dom'
import { useParams } from 'react-router-dom'
import { isAtRisk } from '../../lib/conservation'
import { formatCount, formatPercent } from '../../lib/format'
import { countDistinctSpecies, groupByPhylum } from '../../lib/taxonomy'
import { BiodiversityProcessingState, StatCard } from './BiodiversityTab'
import { CompositionBar } from './KnownTaxaTab'
import { NoveltyBar } from './NovelClustersTab'
import { useResultsContext } from './ResultsLayout'
import { SonarLoader } from '../../components/ui/SonarLoader'

function DetailLink({ to }: { to: string }) {
  return (
    <Link to={to} className="font-mono text-[12px] text-teal hover:text-teal-deep">
      view detail →
    </Link>
  )
}

export function OverviewTab() {
  const { sampleId = '' } = useParams()
  const { results, novelClusters, biodiversity, biodiversityState, biodiversityError } = useResultsContext()

  const knownTaxa = results?.known_taxa ?? []
  const totalReads = results?.total_reads ?? 0
  const distinctSpecies = countDistinctSpecies(knownTaxa)
  const knownReads = knownTaxa.reduce((sum, t) => sum + t.count, 0)
  const novelReads = (novelClusters ?? []).reduce((sum, c) => sum + c.total_reads, 0)
  const unassignedShare = totalReads > 0 ? Math.max(0, 1 - (knownReads + novelReads) / totalReads) : 0
  const atRiskCount = knownTaxa.filter((t) => isAtRisk(t.conservation_status)).length
  const byPhylum = groupByPhylum(knownTaxa)
  const topClusters = (novelClusters ?? []).slice(0, 3)

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-card border border-border bg-surface p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="font-display text-[18px] leading-relaxed text-ink">
          This sample resolved <strong>{formatCount(distinctSpecies)} distinct species</strong> across{' '}
          {formatCount(knownTaxa.length)} matched ASVs, out of {formatCount(totalReads)} total reads.{' '}
          {formatPercent(unassignedShare)} of reads didn't match a known reference or cluster into a candidate.{' '}
          {(novelClusters?.length ?? 0) > 0 ? (
            <>
              {formatCount(novelClusters?.length ?? 0)} candidate-novel cluster
              {(novelClusters?.length ?? 0) === 1 ? '' : 's'} cleared novelty scoring for expert review.{' '}
            </>
          ) : (
            'No candidate-novel clusters were flagged in this sample. '
          )}
          {atRiskCount > 0
            ? `${formatCount(atRiskCount)} known taxa carry an at-risk conservation status (VU/EN/CR).`
            : 'No known taxa in this sample carry an at-risk conservation status.'}
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">Composition</p>
          <DetailLink to={`/results/${sampleId}/known`} />
        </div>
        {knownTaxa.length === 0 ? (
          <p className="font-body text-[13px] text-ink-3">No known taxa yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 min-[800px]:grid-cols-2">
            <CompositionBar rows={knownTaxa} />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">Top 5 phyla by reads</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {byPhylum.slice(0, 5).map((p) => (
                  <li key={p.phylum} className="flex items-center justify-between font-body text-[13px] text-ink-2">
                    <span>{p.phylum}</span>
                    <span className="font-mono text-[12px] text-ink-3">{formatCount(p.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">Biodiversity</p>
          <DetailLink to={`/results/${sampleId}/biodiversity`} />
        </div>
        {biodiversityState === 'error' && (
          <p className="font-body text-[13px] text-ink-3">Could not load biodiversity metrics: {biodiversityError}</p>
        )}
        {biodiversityState === 'loading' && <SonarLoader label="Loading biodiversity metrics…" />}
        {biodiversityState === 'processing' && <BiodiversityProcessingState />}
        {biodiversityState === 'ready' && biodiversity && (
          <div className="grid grid-cols-1 gap-4 min-[700px]:grid-cols-3">
            <StatCard label="Shannon" value={biodiversity.shannon} decimals={2} description="Species evenness, not just count." />
            <StatCard label="Simpson" value={biodiversity.simpson} decimals={2} description="Closer to 1 means more diverse." />
            <StatCard label="Richness" value={biodiversity.richness} decimals={0} description="Distinct taxa and clusters detected." />
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-mono text-[12px] uppercase tracking-mono-label text-ink-3">Top candidate-novel clusters</p>
          <DetailLink to={`/results/${sampleId}/novel`} />
        </div>
        {topClusters.length === 0 ? (
          <p className="font-body text-[13px] text-ink-3">No candidate clusters flagged in this sample.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-3">
            {topClusters.map((cluster) => (
              <div key={cluster.id} className="rounded-card border border-border bg-surface p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
                <span className="font-mono text-[13px] font-medium text-ink">{cluster.placeholder_id}</span>
                <div className="mt-2">
                  <NoveltyBar score={cluster.novelty_score} />
                </div>
                <p className="mt-2 line-clamp-2 font-body text-[12px] leading-relaxed text-ink-2">{cluster.rank_prediction}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
