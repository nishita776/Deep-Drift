import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { JobStatus } from '../api/types'
import { PipelineVisual } from '../components/pipeline/PipelineVisual'
import { currentStageIndex, currentStageLabel, PIPELINE_STAGES } from '../components/pipeline/pipelineStages'
import { useSampleStore } from '../store/useSampleStore'

const RUNNING_TAU_MS = 5200
const RUNNING_CAP = 0.93

function asymptoticProgress(elapsedMs: number): number {
  return RUNNING_CAP * (1 - Math.exp(-elapsedMs / RUNNING_TAU_MS))
}

function humanStatus(status: JobStatus, progress: number): string {
  switch (status) {
    case 'pending':
      return 'Queued — preparing pipeline…'
    case 'running':
      return `Running pipeline — ${currentStageLabel(progress)} (stage ${currentStageIndex(progress) + 1} of ${PIPELINE_STAGES.length})`
    case 'done':
      return 'Analysis complete.'
    case 'failed':
      return 'Analysis failed.'
  }
}

export function Processing() {
  const { sampleId = '' } = useParams()
  const navigate = useNavigate()
  const sample = useSampleStore((s) => s.getSample(sampleId))
  const updateSample = useSampleStore((s) => s.updateSample)

  const [jobId, setJobId] = useState<string | null>(sample?.jobId ?? null)
  const [status, setStatus] = useState<JobStatus>(sample?.status ?? 'pending')
  const [errorLog, setErrorLog] = useState<string | null>(null)
  const [progress, setProgress] = useState(0.03)
  const [retrying, setRetrying] = useState(false)
  const runningStartRef = useRef<number | null>(null)

  // Poll job status every 1500ms until it resolves. Re-runs when jobId changes (a Retry).
  useEffect(() => {
    if (!jobId) return
    let intervalId: ReturnType<typeof setInterval>
    async function poll() {
      try {
        const job = await api.getJobStatus(jobId!)
        setStatus(job.status)
        setErrorLog(job.error_log)
        updateSample(sampleId, { status: job.status })
        if (job.status === 'done' || job.status === 'failed') clearInterval(intervalId)
      } catch {
        // transient network hiccup — next tick retries
      }
    }
    poll()
    intervalId = setInterval(poll, 1500)
    return () => clearInterval(intervalId)
  }, [jobId, sampleId, updateSample])

  // Advance the visual on a smooth timed cycle while running. Never fakes per-stage completion —
  // this is honest narration of an unknown-duration process, not a progress readout from the API.
  useEffect(() => {
    if (status !== 'running') return
    if (runningStartRef.current === null) runningStartRef.current = Date.now()
    const id = setInterval(() => {
      const elapsed = Date.now() - (runningStartRef.current ?? Date.now())
      setProgress(Math.max(0.06, asymptoticProgress(elapsed)))
    }, 150)
    return () => clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status === 'done') setProgress(1)
  }, [status])

  async function handleRetry() {
    if (!sampleId) return
    setRetrying(true)
    setStatus('pending')
    setErrorLog(null)
    runningStartRef.current = null
    setProgress(0.03)
    try {
      const job = await api.runSample(sampleId)
      setJobId(job.id)
      updateSample(sampleId, { jobId: job.id, status: job.status })
    } finally {
      setRetrying(false)
    }
  }

  if (!sample) {
    return (
      <div className="marine-snow flex min-h-svh items-center justify-center px-6 text-center">
        <div>
          <p className="font-display text-xl text-ink">Sample not found</p>
          <Link to="/samples" className="mt-2 inline-block font-body text-teal">
            Back to samples
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="marine-snow flex min-h-svh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-4xl text-center">
        <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">Processing</p>
        <h1 className="mt-1 font-display text-3xl text-ink">{sample.name}</h1>

        <div aria-live="polite" className="mt-2 font-body text-[15px] text-ink-2">
          {humanStatus(status, progress)}
        </div>

        <div className="mt-10 rounded-card border border-border bg-surface p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
          <PipelineVisual progress={progress} variant="light" />
        </div>

        {status === 'failed' && (
          <div className="mt-8 rounded-card border-2 border-sand bg-surface p-6 text-left">
            <p className="font-mono text-[13px] uppercase tracking-mono-label text-sand">Pipeline error</p>
            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-control bg-surface-sunk p-4 font-mono text-[13px] leading-relaxed text-ink">
              {errorLog ?? 'The pipeline stopped unexpectedly. No error log was provided.'}
            </pre>
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="hover-lift press-scale mt-4 rounded-pill bg-coral px-6 py-2.5 font-body text-[15px] font-medium text-ink disabled:opacity-50"
            >
              {retrying ? 'Retrying…' : 'Retry analysis'}
            </button>
          </div>
        )}

        {status === 'done' && (
          <button
            type="button"
            onClick={() => navigate(`/results/${sampleId}/overview`)}
            className="hover-lift press-scale mt-8 rounded-pill bg-coral px-6 py-3 font-body text-[15px] font-medium text-ink"
          >
            View results
          </button>
        )}
      </div>
    </div>
  )
}
