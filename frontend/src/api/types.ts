/* ==========================================================================
   API TYPES — transcribed exactly from the contract (spec §9). IMMUTABLE.
   Do not rename, add, or "improve" fields here — this shape is shared with
   the real FastAPI backend and must match it byte-for-byte.
   ========================================================================== */

export type MarkerGene = '18S' | 'COI'
export type SampleType = 'field' | 'blank'
export type JobStatus = 'pending' | 'running' | 'done' | 'failed'

/** Response of POST /samples */
export interface Sample {
  id: string
  name: string
  sample_type: SampleType
  marker_gene: MarkerGene
  status: 'uploaded'
}

/** Params for POST /samples (multipart/form-data) */
export interface CreateSampleParams {
  name: string
  sample_type?: SampleType /** default 'field' */
  marker_gene?: MarkerGene /** default '18S' */
  file: File
}

/** Response of POST /samples/{sample_id}/run and GET /jobs/{job_id}/status */
export interface Job {
  id: string
  sample_id: string
  status: JobStatus
  error_log: string | null
}

/**
 * The `sample` object embedded in GET /samples/{sample_id}/results.
 * The contract leaves this shape as `{...}` — it is documented as carrying
 * at minimum the same identity fields returned by POST /samples, but its
 * `status` reflects pipeline lifecycle rather than the literal "uploaded".
 */
export interface SampleSummary {
  id: string
  name: string
  sample_type: SampleType
  marker_gene: MarkerGene
  status: string
}

/** IUCN Red List category — from a curated static table, not a live lookup. */
export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'DD' | 'unknown'

/** One row of GET /samples/{sample_id}/results -> known_taxa[] */
export interface KnownTaxon {
  asv_id: string
  /** Truncated to 40 chars + "..." by the backend. */
  sequence_preview: string
  count: number
  status: string
  /** Pipe-delimited: `id|Phylum|Class|species_label`. Split client-side. */
  matched_taxon: string
  /** 0-1 */
  identity_score: number
  database_source: string
  conservation_status: ConservationStatus
}

/** Response of GET /samples/{sample_id}/results */
export interface ResultsResponse {
  sample: SampleSummary
  known_taxa: KnownTaxon[]
  total_reads: number
}

/** One entry of GET /samples/{sample_id}/novel-clusters, sorted by novelty_score desc */
export interface NovelCluster {
  id: string
  placeholder_id: string
  /** Verbatim from the API — already carries its own confidence caveat. Do not reformat. */
  rank_prediction: string
  nearest_reference: string
  /** 0-1 */
  novelty_score: number
  member_count: number
  total_reads: number
}

export interface RarefactionCurve {
  depths: number[]
  richness: number[]
}

/** Response of GET /samples/{sample_id}/biodiversity */
export interface BiodiversityMetrics {
  shannon: number
  simpson: number
  richness: number
  rarefaction_curve: RarefactionCurve
}

/** One entry of GET /samples/compare, keyed by sample id */
export interface CompareEntry {
  name: string
  status: string
  biodiversity: BiodiversityMetrics | null
}

export type CompareResponse = Record<string, CompareEntry>

export type ExportFormat = 'csv' | 'xlsx'

/**
 * Thrown by both adapters for any non-2xx response so callers can branch on
 * `.status` the same way regardless of which adapter is active.
 */
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}
