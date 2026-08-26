import { useEffect, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { api, API_MODE } from '../../api/client'
import { ApiError, type BiodiversityMetrics, type ExportFormat, type NovelCluster, type ResultsResponse } from '../../api/types'
import { CountUp } from '../../components/ui/CountUp'
import { Pill } from '../../components/ui/Pill'
import { Reveal } from '../../components/ui/Reveal'
import { SonarLoader } from '../../components/ui/SonarLoader'
import { Tabs } from '../../components/ui/Tabs'
import { isAtRisk } from '../../lib/conservation'
import { formatTimestamp, truncateId } from '../../lib/format'
import { countDistinctSpecies } from '../../lib/taxonomy'
import { useSampleStore } from '../../store/useSampleStore'

export type BiodiversityState = 'loading' | 'processing' | 'ready' | 'error'

export interface ResultsContext {
  results: ResultsResponse | null
  novelClusters: NovelCluster[] | null
  novelClustersError: string | null
  biodiversity: BiodiversityMetrics | null
  biodiversityState: BiodiversityState
  biodiversityError: string | null
}

export function useResultsContext() {
  return useOutletContext<ResultsContext>()
}

function StatCard({ to, label, value, caption }: { to: string; label: string; value: number | null; caption: string }) {
  return (
    <Link
      to={to}
      className="hover-lift press-scale rounded-card border border-border bg-surface p-4 transition-colors hover:border-teal"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <p className="font-mono text-[11px] uppercase tracking-mono-label text-ink-3">{label}</p>
      <p className="mt-1 font-mono text-3xl text-ink">{value === null ? '—' : <CountUp value={value} />}</p>
      <p className="mt-1 font-body text-[12px] leading-snug text-ink-2">{caption}</p>
    </Link>
  )
}

export function ResultsLayout() {
  const { sampleId = '' } = useParams()
  const sample = useSampleStore((s) => s.getSample(sampleId))

  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

  const [novelClusters, setNovelClusters] = useState<NovelCluster[] | null>(null)
  const [novelClustersError, setNovelClustersError] = useState<string | null>(null)

  const [biodiversity, setBiodiversity] = useState<BiodiversityMetrics | null>(null)
  const [biodiversityState, setBiodiversityState] = useState<BiodiversityState>('loading')
  const [biodiversityError, setBiodiversityError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setResults(null)
    setLoadError(null)
    api
      .getResults(sampleId)
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [sampleId])

  useEffect(() => {
    let cancelled = false
    setNovelClusters(null)
    setNovelClustersError(null)
    api
      .getNovelClusters(sampleId)
      .then((c) => {
        if (!cancelled) setNovelClusters(c)
      })
      .catch((err) => {
        if (!cancelled) setNovelClustersError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      cancelled = true
    }
  }, [sampleId])

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval> | null = null
    setBiodiversity(null)
    setBiodiversityState('loading')
    setBiodiversityError(null)

    async function load() {
      try {
        const result = await api.getBiodiversity(sampleId)
        if (cancelled) return
        setBiodiversity(result)
        setBiodiversityState('ready')
        if (intervalId) clearInterval(intervalId)
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 409) {
          setBiodiversityState('processing')
        } else {
          setBiodiversityError(err instanceof Error ? err.message : String(err))
          setBiodiversityState('error')
          if (intervalId) clearInterval(intervalId)
        }
      }
    }

    load()
    intervalId = setInterval(load, 1500)
    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [sampleId])

  function handleCopyId() {
    navigator.clipboard?.writeText(sampleId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleExport(format: ExportFormat) {
    const url = api.getExportUrl(sampleId, format)
    if (API_MODE === 'mock') {
      console.info(`[mock export] would download: ${url}`)
      setExportNotice(url)
      setTimeout(() => setExportNotice(null), 6000)
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const name = results?.sample.name ?? sample?.name ?? 'Sample'
  const markerGene = results?.sample.marker_gene ?? sample?.markerGene
  const sampleType = results?.sample.sample_type ?? sample?.sampleType

  const distinctSpecies = results ? countDistinctSpecies(results.known_taxa) : null
  const totalReads = results ? results.total_reads : null
  const candidateClusters = novelClusters ? novelClusters.length : null
  const atRiskCount = results ? results.known_taxa.filter((t) => isAtRisk(t.conservation_status)).length : null

  return (
    <div className="marine-snow min-h-svh px-6 py-10 min-[900px]:px-10">
      <div className="mx-auto max-w-6xl">
        <Reveal index={0}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Results</p>
              <h1 className="mt-1 font-display text-3xl text-ink">{name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {markerGene && <Pill tone="teal">{markerGene}</Pill>}
                {sampleType && <Pill>{sampleType}</Pill>}
                {sample && <Pill>{formatTimestamp(sample.createdAt)}</Pill>}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="inline-flex items-center rounded-pill border border-border bg-surface-sunk px-2.5 py-1 font-mono text-[13px] text-ink-2 hover:border-teal"
                  title="Click to copy full sample id"
                >
                  {copied ? 'copied!' : truncateId(sampleId)}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="hover-lift press-scale rounded-control border border-border bg-surface px-4 py-2 font-body text-[14px] text-ink"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport('xlsx')}
                className="hover-lift press-scale rounded-control border border-border bg-surface px-4 py-2 font-body text-[14px] text-ink"
              >
                Export XLSX
              </button>
            </div>
          </div>

          {exportNotice && (
            <p className="mt-3 break-all rounded-control border border-border-soft bg-surface-sunk px-3 py-2 font-mono text-[12px] text-ink-3">
              Mock mode — no file server attached. Real download URL: {exportNotice}
            </p>
          )}
        </Reveal>

        <Reveal index={1} className="mt-6 grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
          <StatCard
            to={`/results/${sampleId}/known`}
            label="Distinct Species"
            value={distinctSpecies}
            caption="One species can contribute many ASVs and reads."
          />
          <StatCard to={`/results/${sampleId}/known`} label="Total Reads" value={totalReads} caption="All reads in this sample, matched or not." />
          <StatCard
            to={`/results/${sampleId}/novel`}
            label="Candidate-Novel Clusters"
            value={candidateClusters}
            caption="Flagged for expert review, not confirmed species."
          />
          <StatCard
            to={`/results/${sampleId}/known?atRisk=1`}
            label="At-Risk Taxa"
            value={atRiskCount}
            caption="VU, EN, or CR on the curated status table."
          />
        </Reveal>

        <Reveal index={2} className="mt-6">
          <Tabs
            items={[
              { to: `/results/${sampleId}/overview`, label: 'Overview' },
              { to: `/results/${sampleId}/known`, label: 'Known Taxa' },
              { to: `/results/${sampleId}/novel`, label: 'Candidate Novel Taxa' },
              { to: `/results/${sampleId}/biodiversity`, label: 'Biodiversity' },
              { to: `/results/${sampleId}/heatmap`, label: 'Heatmap' },
              { to: `/results/${sampleId}/network`, label: 'Network' },
            ]}
          />
        </Reveal>

        <div className="mt-6">
          {loadError && (
            <div className="rounded-control border border-sand bg-surface px-4 py-3 font-body text-[14px] text-ink">
              Could not load results: {loadError}
            </div>
          )}
          {!results && !loadError && <SonarLoader label="Loading results…" />}
          {results && (
            <Outlet
              context={
                {
                  results,
                  novelClusters,
                  novelClustersError,
                  biodiversity,
                  biodiversityState,
                  biodiversityError,
                } satisfies ResultsContext
              }
            />
          )}
        </div>

        {!sample && !results && !loadError && (
          <p className="mt-4 font-body text-[13px] text-ink-3">
            <Link to="/samples" className="text-teal">
              Back to samples
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
