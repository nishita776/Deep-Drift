import { API_BASE, API_MODE } from './config'
import { httpClient } from './http'
import { mockClient } from './mock'
import type {
  BiodiversityMetrics,
  CompareResponse,
  CreateSampleParams,
  ExportFormat,
  Job,
  NovelCluster,
  ResultsResponse,
  Sample,
} from './types'

/**
 * The one interface both adapters satisfy. Components import `api` from
 * this file ONLY — never from `./http` or `./mock` directly — so switching
 * VITE_API_MODE is the entire integration step.
 */
export interface ApiClient {
  createSample(params: CreateSampleParams): Promise<Sample>
  runSample(sampleId: string): Promise<Job>
  getJobStatus(jobId: string): Promise<Job>
  getResults(sampleId: string): Promise<ResultsResponse>
  getNovelClusters(sampleId: string): Promise<NovelCluster[]>
  getBiodiversity(sampleId: string): Promise<BiodiversityMetrics>
  compareSamples(ids: string[]): Promise<CompareResponse>
  /** Not a fetch — builds the download URL for an <a download> / window.open. */
  getExportUrl(sampleId: string, format: ExportFormat): string
  /** Dev-mode reachability check for the connection-check affordance (§11). */
  ping(): Promise<boolean>
}

export { API_BASE, API_MODE }

export const api: ApiClient = API_MODE === 'http' ? httpClient : mockClient
