export const GLOSSARY = {
  asv: 'ASV (Amplicon Sequence Variant): a unique DNA sequence recovered from a sample, the base unit the pipeline matches or clusters.',
  chimera: 'Chimera: a sequencing artifact formed when two different DNA fragments are stitched together by error — removed before clustering.',
  rarefaction: 'Rarefaction: re-sampling reads at increasing depths to check whether sequencing found most of what is really there.',
  noveltyScore: 'Novelty score: how distant a cluster is from anything in the reference databases — higher means less like a known match.',
  markerGene: 'Marker gene: the short standardized DNA region sequenced to identify organisms (18S for broad eukaryotes, COI for animals).',
  blankControl: 'Blank control: a sample with no biological material, run alongside real samples to detect contamination.',
  conservationStatus:
    'Conservation status: IUCN Red List category (LC, NT, VU, EN, CR, DD, or unknown) from a curated static table, not a live IUCN lookup — verify before citing.',
  iucnCategory:
    'IUCN category: the Red List threat level — from Least Concern (LC) through Near Threatened (NT), Vulnerable (VU), Endangered (EN), to Critically Endangered (CR); Data Deficient (DD) means not enough is known to assess.',
} as const
