/* ==========================================================================
   DEV-ONLY SEEDING — D4. Creates a reliable, non-timing-dependent way to
   demo Compare's null-biodiversity ("not yet analysed") row: two samples
   that finish normally, plus one forced to the 'slow' outcome so it stays
   incomplete for the whole demo window. Mock mode only — this directly
   manipulates mock-only state (mockControls), so it's meaningless in http
   mode and is never exposed there (see DevToolsPanel.tsx's mock-mode gate).
   ========================================================================== */
import { mockClient } from './mock'
import { getMockControlsSnapshot, setMockDatasetSize, setMockJobOutcome } from './mockControls'
import type { SampleType } from './types'
import { useSampleStore } from '../store/useSampleStore'

function emptyFastqFile(name: string): File {
  return new File(['@seed\nACGT\n+\nIIII\n'], name, { type: 'text/plain' })
}

async function createAndRun(name: string, sampleType: SampleType = 'field') {
  const addSample = useSampleStore.getState().addSample
  const updateSample = useSampleStore.getState().updateSample

  const sample = await mockClient.createSample({ name, marker_gene: '18S', sample_type: sampleType, file: emptyFastqFile('seed.fastq') })
  addSample({
    sampleId: sample.id,
    jobId: null,
    name: sample.name,
    markerGene: sample.marker_gene,
    sampleType: sample.sample_type,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })
  const job = await mockClient.runSample(sample.id)
  updateSample(sample.id, { jobId: job.id, status: job.status })
  return sample
}

/** Creates 2 finished samples + 1 stuck 'slow' sample, then restores whatever dev-toggle state was active before. */
export async function seedCompareDemo(): Promise<void> {
  const before = getMockControlsSnapshot()

  try {
    setMockJobOutcome('normal')
    setMockDatasetSize('normal')
    await createAndRun('Compare Demo — Station A')
    await createAndRun('Compare Demo — Station B')

    setMockJobOutcome('slow')
    await createAndRun('Compare Demo — still processing')
  } finally {
    setMockJobOutcome(before.jobOutcome)
    setMockDatasetSize(before.datasetSize)
  }
}
