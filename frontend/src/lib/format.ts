/** `matched_taxon` is `id|Phylum|Class|species_label` — the raw pipe string must never be rendered. */
export interface SplitTaxon {
  taxId: string
  phylum: string
  class: string
  species: string
}

export function splitMatchedTaxon(matchedTaxon: string): SplitTaxon {
  const [taxId = '', phylum = '', taxClass = '', species = ''] = matchedTaxon.split('|')
  return { taxId, phylum, class: taxClass, species }
}

export function formatPercent(score: number, digits = 0): string {
  return `${(score * 100).toFixed(digits)}%`
}

export function truncateId(id: string, chars = 8): string {
  return id.length > chars ? `${id.slice(0, chars)}…` : id
}

export function formatCount(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
