import { useEffect, useState } from 'react'
import { Link, Outlet, useOutletContext, useParams } from 'react-router-dom'
import { api, API_MODE } from '../../api/client'
import type { ExportFormat, ResultsResponse } from '../../api/types'
import { Pill } from '../../components/ui/Pill'
import { Reveal } from '../../components/ui/Reveal'
import { SonarLoader } from '../../components/ui/SonarLoader'
import { Tabs } from '../../components/ui/Tabs'
import { formatCount, truncateId } from '../../lib/format'
import { useSampleStore } from '../../store/useSampleStore'

export interface ResultsContext {
  results: ResultsResponse | null
}

export function useResultsContext() {
  return useOutletContext<ResultsContext>()
}

export function ResultsLayout() {
  const { sampleId = '' } = useParams()
  const sample = useSampleStore((s) => s.getSample(sampleId))

  const [results, setResults] = useState<ResultsResponse | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [exportNotice, setExportNotice] = useState<string | null>(null)

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
                {results && <Pill>{formatCount(results.total_reads)} reads</Pill>}
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

        <Reveal index={1} className="mt-6">
          <Tabs
            items={[
              { to: `/results/${sampleId}/known`, label: 'Known Taxa' },
              { to: `/results/${sampleId}/novel`, label: 'Candidate Novel Taxa' },
              { to: `/results/${sampleId}/biodiversity`, label: 'Biodiversity' },
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
          {results && <Outlet context={{ results } satisfies ResultsContext} />}
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
