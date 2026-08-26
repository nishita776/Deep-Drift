import { Link, useNavigate } from 'react-router-dom'
import { api, API_MODE } from '../api/client'
import type { JobStatus } from '../api/types'
import { EmptyState } from '../components/ui/EmptyState'
import { Pill } from '../components/ui/Pill'
import { Reveal } from '../components/ui/Reveal'
import { formatTimestamp } from '../lib/format'
import { useSampleStore } from '../store/useSampleStore'

const STATUS_TONE: Record<JobStatus, 'neutral' | 'teal' | 'coral' | 'sand'> = {
  pending: 'sand',
  running: 'teal',
  done: 'teal',
  failed: 'coral',
}

export function Samples() {
  const samples = useSampleStore((s) => s.samples)
  const updateSample = useSampleStore((s) => s.updateSample)
  const navigate = useNavigate()

  async function handleRerun(sampleId: string) {
    updateSample(sampleId, { status: 'pending' })
    const job = await api.runSample(sampleId)
    updateSample(sampleId, { jobId: job.id, status: job.status })
    navigate(`/processing/${sampleId}`)
  }

  function handleExport(sampleId: string, format: 'csv' | 'xlsx') {
    const url = api.getExportUrl(sampleId, format)
    if (API_MODE === 'mock') {
      console.info(`[mock export] would download: ${url}`)
      window.alert(`Mock mode — real download URL:\n${url}`)
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div className="marine-snow min-h-svh px-6 py-10 min-[900px]:px-10">
      <div className="mx-auto max-w-5xl">
        <Reveal index={0}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Samples</p>
              <h1 className="mt-1 font-display text-3xl text-ink">Sample history</h1>
            </div>
            <Link
              to="/analyse"
              className="hover-lift press-scale rounded-pill bg-coral px-5 py-2.5 font-body text-[14px] font-medium text-ink"
            >
              New analysis
            </Link>
          </div>
        </Reveal>

        {samples.length === 0 ? (
          <EmptyState title="No samples yet" description="Upload a FASTQ file to run your first analysis." />
        ) : (
          <Reveal index={1} className="mt-8">
            <div className="overflow-x-auto rounded-card border border-border">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-surface-sunk">
                    <th className="px-4 py-3 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Name</th>
                    <th className="px-4 py-3 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Marker</th>
                    <th className="px-4 py-3 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Type</th>
                    <th className="px-4 py-3 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Status</th>
                    <th className="px-4 py-3 font-mono text-[12px] uppercase tracking-mono-label text-ink-2">Uploaded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {samples.map((s) => (
                    <tr key={s.sampleId} className="border-t border-border-soft">
                      <td className="px-4 py-3 font-body text-[14px] text-ink">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{s.markerGene}</td>
                      <td className="px-4 py-3 font-mono text-[13px] text-ink-2">{s.sampleType}</td>
                      <td className="px-4 py-3">
                        <Pill tone={STATUS_TONE[s.status]}>{s.status}</Pill>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-ink-3">{formatTimestamp(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {s.status === 'done' ? (
                            <Link
                              to={`/results/${s.sampleId}/known`}
                              className="rounded-control border border-border px-2.5 py-1.5 font-body text-[13px] text-ink-2 hover:border-teal hover:text-teal"
                            >
                              View
                            </Link>
                          ) : (
                            <Link
                              to={`/processing/${s.sampleId}`}
                              className="rounded-control border border-border px-2.5 py-1.5 font-body text-[13px] text-ink-2 hover:border-teal hover:text-teal"
                            >
                              {s.status === 'failed' ? 'Details' : 'Watch'}
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRerun(s.sampleId)}
                            className="rounded-control border border-border px-2.5 py-1.5 font-body text-[13px] text-ink-2 hover:border-teal hover:text-teal"
                          >
                            Re-run
                          </button>
                          {s.status === 'done' && (
                            <button
                              type="button"
                              onClick={() => handleExport(s.sampleId, 'csv')}
                              className="rounded-control border border-border px-2.5 py-1.5 font-body text-[13px] text-ink-2 hover:border-teal hover:text-teal"
                            >
                              Export
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  )
}
