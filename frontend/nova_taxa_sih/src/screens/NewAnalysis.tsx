import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { ApiError, type MarkerGene, type SampleType } from '../api/types'
import { Card } from '../components/ui/Card'
import { Reveal } from '../components/ui/Reveal'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Tip } from '../components/ui/Tip'
import { GLOSSARY } from '../lib/glossary'
import { useSampleStore } from '../store/useSampleStore'

export function NewAnalysis() {
  const navigate = useNavigate()
  const addSample = useSampleStore((s) => s.addSample)

  const [name, setName] = useState('')
  const [markerGene, setMarkerGene] = useState<MarkerGene>('18S')
  const [sampleType, setSampleType] = useState<SampleType>('field')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const canSubmit = name.trim().length > 0 && file !== null && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setSubmitting(true)
    setError(null)
    try {
      const sample = await api.createSample({ name: name.trim(), sample_type: sampleType, marker_gene: markerGene, file })
      addSample({
        sampleId: sample.id,
        jobId: null,
        name: sample.name,
        markerGene: sample.marker_gene,
        sampleType: sample.sample_type,
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
      const job = await api.runSample(sample.id)
      useSampleStore.getState().updateSample(sample.id, { jobId: job.id, status: job.status })
      navigate(`/processing/${sample.id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(`Upload rejected: ${err.message}`)
      } else if (err instanceof ApiError) {
        setError(`Upload failed (${err.status}): ${err.message}`)
      } else {
        setError('Upload failed — check your connection and try again.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="marine-snow min-h-svh px-6 py-10 min-[900px]:py-16">
      <div className="mx-auto max-w-xl">
        <Reveal index={0}>
          <p className="font-mono text-[13px] uppercase tracking-mono-label text-ink-3">New analysis</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Upload a sample</h1>
        </Reveal>

        <Reveal index={1}>
          <Card className="mt-6 p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const dropped = e.dataTransfer.files?.[0]
                  if (dropped) setFile(dropped)
                }}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
                }}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragOver ? 'border-teal bg-seafoam-pale/40' : 'border-seafoam bg-surface-sunk'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".fastq,.fq,.fastq.gz,.fq.gz"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--teal-deep)" strokeWidth="1.5" aria-hidden="true">
                  <path d="M16 21V8M10 14l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M7 24h18" strokeLinecap="round" />
                </svg>
                <p className="font-body text-[15px] text-ink">
                  {file ? file.name : 'Drop a FASTQ file here, or click to browse'}
                </p>
                <p className="font-mono text-[12px] text-ink-3">.fastq · .fq · gzip accepted</p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-body text-[14px] text-ink-2">Sample name</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CMLRE-Trench-04-Rep2"
                  className="rounded-control border border-border bg-surface px-3 py-2.5 font-body text-[15px] text-ink outline-none focus-visible:border-teal"
                />
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="font-body text-[14px] text-ink-2">
                  Marker gene
                  <Tip term="marker gene" definition={GLOSSARY.markerGene} />
                </span>
                <SegmentedControl
                  name="Marker gene"
                  value={markerGene}
                  onChange={setMarkerGene}
                  options={[
                    { value: '18S', label: '18S' },
                    { value: 'COI', label: 'COI' },
                  ]}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-body text-[14px] text-ink-2">
                  Sample type
                  <Tip term="blank control" definition={GLOSSARY.blankControl} />
                </span>
                <SegmentedControl
                  name="Sample type"
                  value={sampleType}
                  onChange={setSampleType}
                  options={[
                    { value: 'field', label: 'Field' },
                    { value: 'blank', label: 'Blank' },
                  ]}
                />
              </div>

              {error && (
                <div className="rounded-control border border-sand bg-surface-sunk px-4 py-3 font-body text-[14px] text-ink">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="hover-lift press-scale rounded-pill bg-coral px-6 py-3 font-body text-[15px] font-medium text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Uploading…' : 'Upload & run analysis'}
              </button>
            </form>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
