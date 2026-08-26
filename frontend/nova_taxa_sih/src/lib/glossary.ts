export const GLOSSARY = {
  asv: 'ASV (Amplicon Sequence Variant): a unique DNA sequence recovered from a sample, the base unit the pipeline matches or clusters.',
  chimera: 'Chimera: a sequencing artifact formed when two different DNA fragments are stitched together by error — removed before clustering.',
  rarefaction: 'Rarefaction: re-sampling reads at increasing depths to check whether sequencing found most of what is really there.',
  noveltyScore: 'Novelty score: how distant a cluster is from anything in the reference databases — higher means less like a known match.',
  markerGene: 'Marker gene: the short standardized DNA region sequenced to identify organisms (18S for broad eukaryotes, COI for animals).',
  blankControl: 'Blank control: a sample with no biological material, run alongside real samples to detect contamination.',
} as const
