import uuid
import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Sample(Base):
    __tablename__ = "samples"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String)
    sample_type: Mapped[str] = mapped_column(String, default="field")  # "field" or "blank"
    marker_gene: Mapped[str] = mapped_column(String, default="18S")     # "18S" or "COI" — never mixed in one run
    upload_path: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="uploaded")     # uploaded -> running -> done -> failed
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)

    asvs: Mapped[list["ASV"]] = relationship(back_populates="sample", cascade="all, delete-orphan")
    jobs: Mapped[list["Job"]] = relationship(back_populates="sample", cascade="all, delete-orphan")
    biodiversity: Mapped["BiodiversityMetric"] = relationship(back_populates="sample", uselist=False, cascade="all, delete-orphan")


class ASV(Base):
    """One unique sequence variant found in a sample, with its read count."""
    __tablename__ = "asvs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sample_id: Mapped[str] = mapped_column(ForeignKey("samples.id"))
    sequence: Mapped[str] = mapped_column(Text)
    count: Mapped[int] = mapped_column(Integer, default=1)

    sample: Mapped["Sample"] = relationship(back_populates="asvs")
    match: Mapped["TaxaMatch"] = relationship(back_populates="asv", uselist=False, cascade="all, delete-orphan")


class TaxaMatch(Base):
    """Result of the reference-search / discovery pipeline for one ASV."""
    __tablename__ = "taxa_matches"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    asv_id: Mapped[str] = mapped_column(ForeignKey("asvs.id"))

    status: Mapped[str] = mapped_column(String)              # "confident_match" | "candidate_novel"
    matched_taxon: Mapped[str | None] = mapped_column(String, nullable=True)
    identity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    database_source: Mapped[str | None] = mapped_column(String, nullable=True)

    cluster_id: Mapped[str | None] = mapped_column(ForeignKey("clusters.id"), nullable=True)

    asv: Mapped["ASV"] = relationship(back_populates="match")
    cluster: Mapped["Cluster"] = relationship(back_populates="members")


class Cluster(Base):
    """A group of unassigned ASVs that cluster together — a candidate
    (possibly novel) taxon. Deliberately has no 'species_name' field:
    we assign a placeholder ID and a confidence-scored rank guess, never
    an invented species name (see novelty_score.py docstring)."""
    __tablename__ = "clusters"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sample_id: Mapped[str] = mapped_column(ForeignKey("samples.id"))
    placeholder_id: Mapped[str] = mapped_column(String)          # e.g. "Cluster_003"
    rank_prediction: Mapped[str | None] = mapped_column(String, nullable=True)   # e.g. "Phylum: Cnidaria (low confidence)"
    nearest_reference: Mapped[str | None] = mapped_column(String, nullable=True)
    novelty_score: Mapped[float] = mapped_column(Float)          # 0 (looks known) .. 1 (looks very novel)
    member_count: Mapped[int] = mapped_column(Integer)
    total_reads: Mapped[int] = mapped_column(Integer)

    members: Mapped[list["TaxaMatch"]] = relationship(back_populates="cluster")


class BiodiversityMetric(Base):
    __tablename__ = "biodiversity_metrics"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sample_id: Mapped[str] = mapped_column(ForeignKey("samples.id"), unique=True)
    shannon: Mapped[float] = mapped_column(Float)
    simpson: Mapped[float] = mapped_column(Float)
    richness: Mapped[int] = mapped_column(Integer)
    rarefaction_curve: Mapped[dict] = mapped_column(JSON)   # {"depths": [...], "richness": [...]}

    sample: Mapped["Sample"] = relationship(back_populates="biodiversity")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    sample_id: Mapped[str] = mapped_column(ForeignKey("samples.id"))
    status: Mapped[str] = mapped_column(String, default="pending")   # pending|running|done|failed
    error_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=datetime.datetime.utcnow)
    finished_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    sample: Mapped["Sample"] = relationship(back_populates="jobs")
