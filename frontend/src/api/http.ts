import type { ApiClient } from './client'
import { API_BASE } from './config'
import {
  ApiError,
  type BiodiversityMetrics,
  type CompareResponse,
  type CreateSampleParams,
  type ExportFormat,
  type Job,
  type NovelCluster,
  type ResultsResponse,
  type Sample,
} from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, init)
  } catch (err) {
    throw new ApiError(0, `Could not reach ${API_BASE} — is the backend running?`, err)
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    const detail =
      body && typeof body === 'object' && 'detail' in body ? String((body as { detail: unknown }).detail) : undefined
    throw new ApiError(res.status, detail ?? `${res.status} ${res.statusText}`, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const httpClient: ApiClient = {
  async createSample({ name, sample_type = 'field', marker_gene = '18S', file }: CreateSampleParams) {
    const form = new FormData()
    form.set('name', name)
    form.set('sample_type', sample_type)
    form.set('marker_gene', marker_gene)
    form.set('file', file)
    return request<Sample>('/samples', { method: 'POST', body: form })
  },

  async runSample(sampleId) {
    return request<Job>(`/samples/${sampleId}/run`, { method: 'POST' })
  },

  async getJobStatus(jobId) {
    return request<Job>(`/jobs/${jobId}/status`)
  },

  async getResults(sampleId) {
    return request<ResultsResponse>(`/samples/${sampleId}/results`)
  },

  async getNovelClusters(sampleId) {
    return request<NovelCluster[]>(`/samples/${sampleId}/novel-clusters`)
  },

  async getBiodiversity(sampleId) {
    return request<BiodiversityMetrics>(`/samples/${sampleId}/biodiversity`)
  },

  async compareSamples(ids) {
    return request<CompareResponse>(`/samples/compare?ids=${ids.map(encodeURIComponent).join(',')}`)
  },

  getExportUrl(sampleId, format: ExportFormat) {
    return `${API_BASE}/samples/${sampleId}/export?format=${format}`
  },

  async ping() {
    try {
      const res = await fetch(`${API_BASE}/docs`, { method: 'GET' })
      return res.ok
    } catch {
      return false
    }
  },
}
