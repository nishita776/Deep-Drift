import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JobStatus, MarkerGene, SampleType } from '../api/types'

export interface SampleHistoryEntry {
  sampleId: string
  jobId: string | null
  name: string
  markerGene: MarkerGene
  sampleType: SampleType
  status: JobStatus
  createdAt: string
}

interface SampleStoreState {
  samples: SampleHistoryEntry[]
  addSample: (entry: SampleHistoryEntry) => void
  updateSample: (sampleId: string, patch: Partial<SampleHistoryEntry>) => void
  getSample: (sampleId: string) => SampleHistoryEntry | undefined
}

export const useSampleStore = create<SampleStoreState>()(
  persist(
    (set, get) => ({
      samples: [],
      addSample: (entry) => set((state) => ({ samples: [entry, ...state.samples] })),
      updateSample: (sampleId, patch) =>
        set((state) => ({
          samples: state.samples.map((s) => (s.sampleId === sampleId ? { ...s, ...patch } : s)),
        })),
      getSample: (sampleId) => get().samples.find((s) => s.sampleId === sampleId),
    }),
    { name: 'deepdrift-samples' },
  ),
)
