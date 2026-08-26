import type { BiodiversityMetrics, ConservationStatus, KnownTaxon, NovelCluster } from './types'

/* ==========================================================================
   MOCK FIXTURES — deterministic, realistic data for the mock adapter.
   ========================================================================== */

interface TaxonRef {
  phylum: string
  class: string
  species: string
  /** Mirrors the curated table in backend/app/data/conservation_status.json where the species overlaps. */
  conservationStatus: ConservationStatus
}

const TAXA_POOL: TaxonRef[] = [
  { phylum: 'Chordata', class: 'Actinopteri', species: 'Bathylagus euryops', conservationStatus: 'NT' },
  { phylum: 'Chordata', class: 'Elasmobranchii', species: 'Centroscymnus coelolepis', conservationStatus: 'EN' },
  { phylum: 'Chordata', class: 'Actinopteri', species: 'Coryphaenoides armatus', conservationStatus: 'NT' },
  { phylum: 'Chordata', class: 'Ascidiacea', species: 'Culeolus sp.', conservationStatus: 'unknown' },
  { phylum: 'Arthropoda', class: 'Malacostraca', species: 'Gnathophausia ingens', conservationStatus: 'LC' },
  { phylum: 'Arthropoda', class: 'Malacostraca', species: 'Eurythenes gryllus', conservationStatus: 'DD' },
  { phylum: 'Arthropoda', class: 'Ostracoda', species: 'Gigantocypris agassizii', conservationStatus: 'DD' },
  { phylum: 'Arthropoda', class: 'Copepoda', species: 'Calanus hyperboreus', conservationStatus: 'LC' },
  { phylum: 'Cnidaria', class: 'Hydrozoa', species: 'Crossota norvegica', conservationStatus: 'DD' },
  { phylum: 'Cnidaria', class: 'Anthozoa', species: 'Anthomastus sp.', conservationStatus: 'unknown' },
  { phylum: 'Cnidaria', class: 'Scyphozoa', species: 'Periphylla periphylla', conservationStatus: 'LC' },
  { phylum: 'Mollusca', class: 'Cephalopoda', species: 'Vampyroteuthis infernalis', conservationStatus: 'DD' },
  { phylum: 'Mollusca', class: 'Bivalvia', species: 'Calyptogena magnifica', conservationStatus: 'DD' },
  { phylum: 'Mollusca', class: 'Gastropoda', species: 'Bathybembix sp.', conservationStatus: 'unknown' },
  { phylum: 'Annelida', class: 'Polychaeta', species: 'Chaetopterus sp.', conservationStatus: 'unknown' },
  { phylum: 'Annelida', class: 'Polychaeta', species: 'Alvinella pompejana', conservationStatus: 'DD' },
  { phylum: 'Echinodermata', class: 'Holothuroidea', species: 'Peniagone diaphana', conservationStatus: 'DD' },
  { phylum: 'Echinodermata', class: 'Ophiuroidea', species: 'Ophiomusium lymani', conservationStatus: 'DD' },
  { phylum: 'Echinodermata', class: 'Asteroidea', species: 'Freyella elegans', conservationStatus: 'DD' },
  { phylum: 'Porifera', class: 'Hexactinellida', species: 'Euplectella aspergillum', conservationStatus: 'DD' },
  { phylum: 'Foraminifera', class: 'Globothalamea', species: 'Globobulimina sp.', conservationStatus: 'unknown' },
  { phylum: 'Bryozoa', class: 'Gymnolaemata', species: 'Cellaria sp.', conservationStatus: 'unknown' },
  { phylum: 'Nematoda', class: 'Chromadorea', species: 'Deontostoma sp.', conservationStatus: 'unknown' },
  { phylum: 'Ctenophora', class: 'Tentaculata', species: 'Beroe sp.', conservationStatus: 'LC' },
  { phylum: 'Nemertea', class: 'Anopla', species: 'Baseodiscus sp.', conservationStatus: 'unknown' },
  { phylum: 'Chaetognatha', class: 'Sagittoidea', species: 'Eukrohnia hamata', conservationStatus: 'LC' },
  { phylum: 'Radiolaria', class: 'Polycystinea', species: 'Collozoum sp.', conservationStatus: 'unknown' },
  { phylum: 'Dinoflagellata', class: 'Dinophyceae', species: 'Noctiluca scintillans', conservationStatus: 'LC' },
]

const DB_SOURCES = ['SILVA 138', 'PR2', 'BOLD', 'MIDORI2', 'NCBI nt']

const CONFIDENCE_PHRASES = [
  'moderate confidence — reference coverage sparse below 1000m',
  'low-moderate confidence',
  'low confidence, family-level placement uncertain',
  'moderate confidence based on divergence from nearest reference',
]

/** Small seeded PRNG (mulberry32) so generated fixtures are reproducible. */
function mulberry32(seed: number): () => number {
  let s = seed
  return function rand() {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BASES = ['A', 'C', 'G', 'T']

function randomSequence(rand: () => number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += BASES[Math.floor(rand() * 4)]
  return s
}

function previewOf(seq: string): string {
  return seq.length > 40 ? `${seq.slice(0, 40)}...` : seq
}

function taxIdFor(index: number): string {
  return `tax_${String(1000 + index).padStart(4, '0')}`
}

export function generateKnownTaxa(count: number, seed: number): KnownTaxon[] {
  const rand = mulberry32(seed)
  const rows: KnownTaxon[] = []
  for (let i = 0; i < count; i++) {
    const taxon = TAXA_POOL[i % TAXA_POOL.length]
    const seq = randomSequence(rand, 180 + Math.floor(rand() * 80))
    const identity = 0.7 + rand() * 0.29
    rows.push({
      asv_id: `ASV_${String(i + 1).padStart(4, '0')}`,
      sequence_preview: previewOf(seq),
      count: Math.round(20 + rand() * 1800),
      status: 'matched',
      matched_taxon: `${taxIdFor(i)}|${taxon.phylum}|${taxon.class}|${taxon.species}`,
      identity_score: Math.round(identity * 1000) / 1000,
      database_source: DB_SOURCES[i % DB_SOURCES.length],
      conservation_status: taxon.conservationStatus,
    })
  }
  return rows
}

export function generateNovelClusters(count: number, seed: number): NovelCluster[] {
  const rand = mulberry32(seed)
  const rows: NovelCluster[] = []
  for (let i = 0; i < count; i++) {
    const taxon = TAXA_POOL[(i * 3 + 1) % TAXA_POOL.length]
    const novelty = Math.max(0.5, Math.min(0.97, 0.97 - (i / count) * 0.45 - rand() * 0.05))
    const identityToNearest = Math.round(60 + rand() * 25)
    const phrase = CONFIDENCE_PHRASES[i % CONFIDENCE_PHRASES.length]
    rows.push({
      id: crypto.randomUUID(),
      placeholder_id: `Cluster_${String(i + 1).padStart(3, '0')}`,
      rank_prediction: `Possible undescribed lineage near ${taxon.class} (${phrase})`,
      nearest_reference: `${taxon.phylum} > ${taxon.class} > ${taxon.species} (${identityToNearest}% identity)`,
      novelty_score: Math.round(novelty * 1000) / 1000,
      member_count: Math.round(3 + rand() * 60),
      total_reads: Math.round(40 + rand() * 900),
    })
  }
  return rows.sort((a, b) => b.novelty_score - a.novelty_score)
}

export function generateBiodiversity(totalRichness: number, totalReads: number): BiodiversityMetrics {
  const depths = [0, 1000, 2500, 5000, 10000, 20000, 40000, 80000, 150000, totalReads]
  const richness = depths.map((d) => Math.round(totalRichness * (1 - Math.exp(-d / 40000))))
  richness[richness.length - 1] = totalRichness
  for (let i = 1; i < richness.length; i++) richness[i] = Math.max(richness[i], richness[i - 1])
  return {
    shannon: 3.8,
    simpson: 0.93,
    richness: totalRichness,
    rarefaction_curve: { depths, richness },
  }
}

export function emptyBiodiversity(): BiodiversityMetrics {
  return { shannon: 0, simpson: 0, richness: 0, rarefaction_curve: { depths: [0], richness: [0] } }
}

export function baseKnownTaxa(): KnownTaxon[] {
  return [
    {
      asv_id: 'ASV_0001',
      sequence_preview: 'GCTACGGAAGTTCACGCTAGGCATCGATTGCAACGCTTA...',
      count: 1820,
      status: 'matched',
      matched_taxon: 'tax_2318|Chordata|Actinopteri|Bathylagus euryops',
      identity_score: 0.97,
      database_source: 'SILVA 138',
      conservation_status: 'NT',
    },
    {
      asv_id: 'ASV_0002',
      sequence_preview: 'TTGGCAACGACCTTAGTTCAGCGAGGCTAGCATCGTTAA...',
      count: 964,
      status: 'matched',
      matched_taxon: 'tax_0442|Arthropoda|Malacostraca|Gnathophausia ingens',
      identity_score: 0.94,
      database_source: 'BOLD',
      conservation_status: 'LC',
    },
    {
      asv_id: 'ASV_0003',
      sequence_preview: 'AGGCTTGACATCCAGTGCAAGCTTGGATCCTTAGCTGAA...',
      count: 731,
      status: 'matched',
      matched_taxon: 'tax_1187|Cnidaria|Hydrozoa|Crossota norvegica',
      identity_score: 0.91,
      database_source: 'SILVA 138',
      conservation_status: 'DD',
    },
    {
      asv_id: 'ASV_0004',
      sequence_preview: 'CCTAGGGCTAACGCATTAAGCACACCGCCCGTCACTCTA...',
      count: 588,
      status: 'matched',
      matched_taxon: 'tax_3390|Mollusca|Cephalopoda|Vampyroteuthis infernalis',
      identity_score: 0.88,
      database_source: 'BOLD',
      conservation_status: 'DD',
    },
    {
      asv_id: 'ASV_0005',
      sequence_preview: 'GATCGGAAGAGCACACGTCTGAACTCCAGTCACATCTCG...',
      count: 512,
      status: 'matched',
      matched_taxon: 'tax_2765|Chordata|Elasmobranchii|Centroscymnus coelolepis',
      identity_score: 0.95,
      database_source: 'SILVA 138',
      conservation_status: 'EN',
    },
    {
      asv_id: 'ASV_0006',
      sequence_preview: 'TAGCCTGGAATTCAGCGGTACACGGTCAACGATCTGAGA...',
      count: 344,
      status: 'matched',
      matched_taxon: 'tax_0921|Annelida|Polychaeta|Chaetopterus sp.',
      identity_score: 0.82,
      database_source: 'BOLD',
      conservation_status: 'unknown',
    },
    {
      asv_id: 'ASV_0007',
      sequence_preview: 'CGGATCAACTTGAGTGGCTAAGGCTTGCAATCCGATGCA...',
      count: 289,
      status: 'matched',
      matched_taxon: 'tax_1654|Echinodermata|Holothuroidea|Peniagone diaphana',
      identity_score: 0.9,
      database_source: 'SILVA 138',
      conservation_status: 'DD',
    },
    {
      asv_id: 'ASV_0008',
      sequence_preview: 'ACTGCAGGTTCACCTACGGAAACCTTGTTACGACTTCTC...',
      count: 176,
      status: 'matched',
      matched_taxon: 'tax_4102|Foraminifera|Globothalamea|Globobulimina sp.',
      identity_score: 0.76,
      database_source: 'SILVA 138',
      conservation_status: 'unknown',
    },
  ]
}

export function baseNovelClusters(): NovelCluster[] {
  return [
    {
      id: crypto.randomUUID(),
      placeholder_id: 'Cluster_001',
      rank_prediction:
        'Likely novel species within genus Bathylagus (moderate confidence — reference coverage sparse below 1000m)',
      nearest_reference: 'Chordata > Actinopteri > Bathylagus euryops (89% identity)',
      novelty_score: 0.88,
      member_count: 34,
      total_reads: 512,
    },
    {
      id: crypto.randomUUID(),
      placeholder_id: 'Cluster_002',
      rank_prediction: 'Possible undescribed genus within Hydrozoa (low-moderate confidence)',
      nearest_reference: 'Cnidaria > Hydrozoa > Crossota norvegica (81% identity)',
      novelty_score: 0.79,
      member_count: 21,
      total_reads: 301,
    },
    {
      id: crypto.randomUUID(),
      placeholder_id: 'Cluster_003',
      rank_prediction: 'Divergent lineage within Polychaeta, family-level placement uncertain (low confidence)',
      nearest_reference: 'Annelida > Polychaeta > Chaetopterus sp. (74% identity)',
      novelty_score: 0.62,
      member_count: 9,
      total_reads: 118,
    },
  ]
}

export function baseBiodiversity(): BiodiversityMetrics {
  return {
    shannon: 2.14,
    simpson: 0.81,
    richness: 11,
    rarefaction_curve: {
      depths: [0, 500, 1000, 2000, 4000, 8000, 16000, 28450],
      richness: [0, 3, 5, 7, 9, 10, 10, 11],
    },
  }
}

export const FAILURE_LOG = `[ERROR] Stage 5/8 -- Artifact & Contamination Filter
Traceback (most recent call last):
  File "pipeline/filter.py", line 142, in run_filter
    raise ContaminationThresholdError(
ContaminationThresholdError: blank control cross-contamination (14.2%) exceeds configured threshold (10%)
Pipeline halted before clustering stage. Re-run after reviewing the paired blank control sample.`

export const LARGE_KNOWN_TAXA_SEED = 42
export const LARGE_NOVEL_CLUSTERS_SEED = 43
export const LARGE_KNOWN_TAXA_COUNT = 500
export const LARGE_NOVEL_CLUSTERS_COUNT = 40
