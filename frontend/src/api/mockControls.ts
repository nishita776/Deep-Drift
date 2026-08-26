/* ==========================================================================
   MOCK CONTROLS — state backing the dev-only toggle panel (§ Phase 2 / §11).
   Snapshotted by mock.ts each time a run is triggered, so flipping a toggle
   only affects the *next* run — an in-flight job keeps whatever it started
   with. Immutable-replace on write so useSyncExternalStore can diff by
   reference.
   ========================================================================== */

export type MockJobOutcome = 'normal' | 'failed' | 'slow'
export type MockDatasetSize = 'normal' | 'empty' | 'large'

export interface MockControlsState {
  jobOutcome: MockJobOutcome
  datasetSize: MockDatasetSize
}

let state: MockControlsState = { jobOutcome: 'normal', datasetSize: 'normal' }
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function getMockControlsSnapshot(): MockControlsState {
  return state
}

export function subscribeMockControls(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setMockJobOutcome(jobOutcome: MockJobOutcome) {
  state = { ...state, jobOutcome }
  notify()
}

export function setMockDatasetSize(datasetSize: MockDatasetSize) {
  state = { ...state, datasetSize }
  notify()
}
