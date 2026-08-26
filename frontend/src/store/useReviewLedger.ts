import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Client-side-only review ledger for candidate novel clusters. No backend
 * endpoint exists for this yet (§7 C2) — Confirm / Reject / Flag decisions
 * live in localStorage until the real API grows an endpoint for them.
 */
export type ReviewDecision = 'confirmed' | 'rejected' | 'flagged'

export interface ReviewEntry {
  decision: ReviewDecision
  updatedAt: string
}

interface ReviewLedgerState {
  entries: Record<string, ReviewEntry>
  setDecision: (clusterId: string, decision: ReviewDecision) => void
  clearDecision: (clusterId: string) => void
}

export const useReviewLedger = create<ReviewLedgerState>()(
  persist(
    (set) => ({
      entries: {},
      setDecision: (clusterId, decision) =>
        set((state) => ({
          entries: { ...state.entries, [clusterId]: { decision, updatedAt: new Date().toISOString() } },
        })),
      clearDecision: (clusterId) =>
        set((state) => {
          const next = { ...state.entries }
          delete next[clusterId]
          return { entries: next }
        }),
    }),
    { name: 'deepdrift-review-ledger' },
  ),
)
