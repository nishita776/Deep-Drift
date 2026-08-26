export const PIPELINE_STAGES = [
  'Sequencing & QC',
  'ASV Generation',
  'Reference Search',
  'Confidence Split',
  'Artifact & Contamination Filter',
  'Embedding + HDBSCAN Clustering',
  'Novelty Scoring',
  'Biodiversity Metrics',
] as const

export type PipelineStageStatus = 'pending' | 'active' | 'complete'

/** progress is 0..1 over the whole pipeline; stage completes when progress crosses (index+1)/8. */
export function stageStatus(index: number, progress: number): PipelineStageStatus {
  const p = progress * PIPELINE_STAGES.length
  if (p >= index + 1) return 'complete'
  if (p > index) return 'active'
  return 'pending'
}

export function currentStageIndex(progress: number): number {
  const p = progress * PIPELINE_STAGES.length
  return Math.min(PIPELINE_STAGES.length - 1, Math.floor(p))
}

export function currentStageLabel(progress: number): string {
  if (progress >= 1) return PIPELINE_STAGES[PIPELINE_STAGES.length - 1]
  return PIPELINE_STAGES[currentStageIndex(progress)]
}
