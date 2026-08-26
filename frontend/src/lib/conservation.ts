import type { ConservationStatus } from '../api/types'

export interface ConservationToneInfo {
  label: string
  toneClass: string
}

/** CR/EN -> coral (needs attention). VU/NT -> sand (watch). LC/DD/unknown -> muted ink-3. Tokens only. */
export const CONSERVATION_TONE: Record<ConservationStatus, ConservationToneInfo> = {
  CR: { label: 'Critically Endangered', toneClass: 'border-coral text-coral bg-coral-soft' },
  EN: { label: 'Endangered', toneClass: 'border-coral text-coral bg-coral-soft' },
  VU: { label: 'Vulnerable', toneClass: 'border-sand text-sand bg-surface-sunk' },
  NT: { label: 'Near Threatened', toneClass: 'border-sand text-sand bg-surface-sunk' },
  LC: { label: 'Least Concern', toneClass: 'border-border-soft text-ink-3 bg-surface-sunk' },
  DD: { label: 'Data Deficient', toneClass: 'border-border-soft text-ink-3 bg-surface-sunk' },
  unknown: { label: 'Unknown', toneClass: 'border-border-soft text-ink-3 bg-surface-sunk' },
}

export const AT_RISK_STATUSES: ConservationStatus[] = ['VU', 'EN', 'CR']

export function isAtRisk(status: ConservationStatus): boolean {
  return AT_RISK_STATUSES.includes(status)
}
