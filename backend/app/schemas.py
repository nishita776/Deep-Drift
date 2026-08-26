from pydantic import BaseModel


class SampleOut(BaseModel):
    id: str
    name: str
    sample_type: str
    marker_gene: str
    status: str

    class Config:
        from_attributes = True


class JobOut(BaseModel):
    id: str
    sample_id: str
    status: str
    error_log: str | None = None

    class Config:
        from_attributes = True


class TaxaMatchOut(BaseModel):
    asv_id: str
    sequence_preview: str
    count: int
    status: str
    matched_taxon: str | None
    identity_score: float | None
    database_source: str | None


class ClusterOut(BaseModel):
    id: str
    placeholder_id: str
    rank_prediction: str | None
    nearest_reference: str | None
    novelty_score: float
    member_count: int
    total_reads: int

    class Config:
        from_attributes = True


class BiodiversityOut(BaseModel):
    shannon: float
    simpson: float
    richness: int
    rarefaction_curve: dict

    class Config:
        from_attributes = True


class SampleResultsOut(BaseModel):
    sample: SampleOut
    known_taxa: list[TaxaMatchOut]
    total_reads: int
