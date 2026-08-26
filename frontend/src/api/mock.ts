import type { ApiClient } from './client'
import { API_BASE } from './config'
import {
  baseBiodiversity,
  baseKnownTaxa,
  baseNovelClusters,
  emptyBiodiversity,
  FAILURE_LOG,
  generateBiodiversity,
  generateKnownTaxa,
  generateNovelClusters,
  LARGE_KNOWN_TAXA_COUNT,
  LARGE_KNOWN_TAXA_SEED,
  LARGE_NOVEL_CLUSTERS_COUNT,
  LARGE_NOVEL_CLUSTERS_SEED,
} from './mockFixtures'
import { getMockControlsSnapshot, type MockJobOutcome } from './mockControls'
import {
  ApiError,
  type BiodiversityMetrics,
  type CompareResponse,
  type CreateSampleParams,
  type ExportFormat,
  type Job,
  type JobStatus,
  type KnownTaxon,
  type MarkerGene,
  type NovelCluster,
  type ResultsResponse,
  type Sample,
} from './types'

/* ==========================================================================
   MOCK ADAPTER — behaves like a real async server, not a static JSON dump.
   Satisfies the exact same ApiClient interface as ./http:
     - 300-800ms latency per call
     - a genuine pending -> running -> done job lifecycle over ~6-8s
     - 422 on bad marker_gene, 404 on unknown ids, 409 on premature biodiversity
     - dev toggle panel (mockControls.ts) can force failed / slow / empty /
       large-dataset states for the *next* run
   ========================================================================== */

const VALID_MARKER_GENES: MarkerGene[] = ['18S', 'COI']

function delay(minMs = 300, maxMs = 800): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uuid(): string {
  return crypto.randomUUID()
}

interface RunMeta {
  outcome: MockJobOutcome
  runningAt: number // absolute Date.now() timestamp
  resolveAt: number // absolute Date.now() timestamp
}

interface MockRecord {
  sample: Sample
  jobId: string | null
  jobStatus: JobStatus
  errorLog: string | null
  totalReads: number
  knownTaxa: KnownTaxon[]
  novelClusters: NovelCluster[]
  biodiversity: BiodiversityMetrics
  /** Invalidated + regenerated each time a lifecycle timer fires, so a superseded run's timers are no-ops. */
  generation: number
  /** Absolute timestamps for the current run, so status can be reconciled from wall-clock time after a reload wipes in-memory setTimeouts. */
  runMeta: RunMeta | null
}

/**
 * A real backend's data lives server-side and survives a frontend reload —
 * this in-memory Map alone would not. Mirror it into localStorage so a
 * mid-demo browser refresh (or a Vite dev-server restart) doesn't leave the
 * persisted sample history pointing at data the mock has forgotten.
 */
const STORAGE_KEY = 'deepdrift-mock-store'

function loadStore(): Map<string, MockRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Map()
    return new Map(JSON.parse(raw) as [string, MockRecord][])
  } catch {
    return new Map()
  }
}

function persistStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...store.entries()]))
  } catch {
    // best-effort — mock convenience only, never blocks a response
  }
}

const store = loadStore()

/**
 * Recomputes jobStatus from wall-clock time against the persisted runMeta
 * timestamps. Called on every status read so a reload that wiped the
 * in-memory setTimeouts below still self-heals to the correct status
 * instead of leaving a job stuck at 'pending' forever.
 */
function reconcileStatus(record: MockRecord): void {
  const meta = record.runMeta
  if (!meta || record.jobStatus === 'done' || record.jobStatus === 'failed') return

  const now = Date.now()
  if (now >= meta.resolveAt) {
    if (meta.outcome === 'failed') {
      record.jobStatus = 'failed'
      record.errorLog = FAILURE_LOG
    } else {
      record.jobStatus = 'done'
    }
    persistStore()
  } else if (now >= meta.runningAt && record.jobStatus === 'pending') {
    record.jobStatus = 'running'
    persistStore()
  }
}

/** Drives pending -> running -> (done|failed) on a timeline matching `outcome`, via both live timers and reconcileStatus as a reload-safe fallback. */
function scheduleJobLifecycle(record: MockRecord, outcome: MockJobOutcome) {
  const myGeneration = record.generation
  const isCurrent = () => store.get(record.sample.id)?.generation === myGeneration

  const runningAt = Date.now() + 1200 + Math.random() * 800
  const resolveAt =
    outcome === 'failed'
      ? runningAt + 2500 + Math.random() * 2000
      : outcome === 'slow'
        ? runningAt + 22000 + Math.random() * 4000
        : runningAt + 5000 + Math.random() * 2000

  record.runMeta = { outcome, runningAt, resolveAt }

  setTimeout(
    () => {
      if (!isCurrent()) return
      reconcileStatus(record)
    },
    Math.max(0, runningAt - Date.now()),
  )
  setTimeout(
    () => {
      if (!isCurrent()) return
      reconcileStatus(record)
    },
    Math.max(0, resolveAt - Date.now()),
  )
}

export const mockClient: ApiClient = {
  async createSample({ name, sample_type = 'field', marker_gene = '18S', file }: CreateSampleParams) {
    await delay()

    if (!VALID_MARKER_GENES.includes(marker_gene)) {
      throw new ApiError(422, `marker_gene must be one of ${VALID_MARKER_GENES.join(', ')}, got "${marker_gene}"`)
    }
    void file // mock does not need to read the file contents

    const sample: Sample = {
      id: uuid(),
      name,
      sample_type,
      marker_gene,
      status: 'uploaded',
    }

    store.set(sample.id, {
      sample,
      jobId: null,
      jobStatus: 'pending',
      errorLog: null,
      totalReads: 28450,
      knownTaxa: baseKnownTaxa(),
      novelClusters: baseNovelClusters(),
      biodiversity: baseBiodiversity(),
      generation: 0,
      runMeta: null,
    })
    persistStore()

    return sample
  },

  async runSample(sampleId) {
    await delay()
    const record = store.get(sampleId)
    if (!record) throw new ApiError(404, `Unknown sample_id "${sampleId}"`)

    const { jobOutcome, datasetSize } = getMockControlsSnapshot()

    if (datasetSize === 'empty') {
      record.knownTaxa = []
      record.novelClusters = []
      record.totalReads = 0
      record.biodiversity = emptyBiodiversity()
    } else if (datasetSize === 'large') {
      record.knownTaxa = generateKnownTaxa(LARGE_KNOWN_TAXA_COUNT, LARGE_KNOWN_TAXA_SEED)
      record.novelClusters = generateNovelClusters(LARGE_NOVEL_CLUSTERS_COUNT, LARGE_NOVEL_CLUSTERS_SEED)
      record.totalReads = record.knownTaxa.reduce((sum, t) => sum + t.count, 0) + 15000
      record.biodiversity = generateBiodiversity(
        record.knownTaxa.length + record.novelClusters.length,
        record.totalReads,
      )
    } else {
      record.knownTaxa = baseKnownTaxa()
      record.novelClusters = baseNovelClusters()
      record.totalReads = 28450
      record.biodiversity = baseBiodiversity()
    }

    record.jobId = uuid()
    record.jobStatus = 'pending'
    record.errorLog = null
    record.generation += 1
    persistStore()
    scheduleJobLifecycle(record, jobOutcome)

    const job: Job = { id: record.jobId, sample_id: sampleId, status: record.jobStatus, error_log: record.errorLog }
    return job
  },

  async getJobStatus(jobId) {
    await delay(150, 350)
    const record = [...store.values()].find((r) => r.jobId === jobId)
    if (!record) throw new ApiError(404, `Unknown job_id "${jobId}"`)
    reconcileStatus(record)

    const job: Job = {
      id: jobId,
      sample_id: record.sample.id,
      status: record.jobStatus,
      error_log: record.errorLog,
    }
    return job
  },

  async getResults(sampleId) {
    await delay()
    const record = store.get(sampleId)
    if (!record) throw new ApiError(404, `Unknown sample_id "${sampleId}"`)

    const results: ResultsResponse = {
      sample: {
        id: record.sample.id,
        name: record.sample.name,
        sample_type: record.sample.sample_type,
        marker_gene: record.sample.marker_gene,
        status: record.jobStatus,
      },
      known_taxa: record.knownTaxa,
      total_reads: record.totalReads,
    }
    return results
  },

  async getNovelClusters(sampleId) {
    await delay()
    const record = store.get(sampleId)
    if (!record) throw new ApiError(404, `Unknown sample_id "${sampleId}"`)
    return record.novelClusters
  },

  async getBiodiversity(sampleId) {
    await delay()
    const record = store.get(sampleId)
    if (!record) throw new ApiError(404, `Unknown sample_id "${sampleId}"`)
    reconcileStatus(record)
    if (record.jobStatus !== 'done') {
      throw new ApiError(409, 'Pipeline has not finished — biodiversity metrics are not ready yet.')
    }
    return record.biodiversity
  },

  async compareSamples(ids) {
    await delay()
    const response: CompareResponse = {}
    for (const id of ids) {
      const record = store.get(id)
      if (!record) continue
      response[id] = {
        name: record.sample.name,
        status: record.jobStatus,
        biodiversity: record.jobStatus === 'done' ? record.biodiversity : null,
      }
    }
    return response
  },

  getExportUrl(sampleId, format: ExportFormat) {
    return `${API_BASE}/samples/${sampleId}/export?format=${format}`
  },

  async ping() {
    await delay(50, 150)
    return true
  },
}
