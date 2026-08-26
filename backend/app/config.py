"""
Central configuration. Everything here is overridable via environment
variables (or a .env file) so teammates never have to edit code to run
this locally or in Docker.
"""
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Defaults to a local SQLite file so anyone can run this with zero setup.
    # docker-compose.yml overrides this to point at the Postgres container.
    database_url: str = "sqlite:///./dev.db"

    storage_dir: str = "storage"

    # Per-marker-gene reference FASTAs. 18S and COI are NOT interchangeable —
    # never search one marker's reads against the other marker's reference set.
    # Populate these with scripts/build_reference_db.py (real SILVA/PR2 for 18S,
    # real BOLD/NCBI COI barcodes for COI). Falls back to the toy demo file if
    # a real one hasn't been built yet, so local dev still runs with zero setup.
    reference_fasta_18s: str = str(Path(__file__).parent / "data" / "reference_18s.fasta")
    reference_fasta_coi: str = str(Path(__file__).parent / "data" / "reference_coi.fasta")
    reference_fasta: str = str(Path(__file__).parent / "data" / "sample_reference.fasta")  # legacy fallback only

    def reference_fasta_for(self, marker_gene: str) -> str:
        """Resolves the correct per-marker reference FASTA, falling back to
        the toy demo file if the real one hasn't been built yet (see
        scripts/build_reference_db.py)."""
        path = self.reference_fasta_18s if marker_gene.upper() == "18S" else self.reference_fasta_coi
        return path if Path(path).exists() else self.reference_fasta

    # Fraction identity above which a read counts as a "confident match"
    # against the reference set. This is the number that should eventually
    # be replaced by a properly calibrated statistic (see novelty_score.py
    # docstring) rather than a hand-picked constant.
    confident_match_threshold: float = 0.85

    # k-mer size used by the fallback embedding (see embedding.py)
    kmer_size: int = 4

    # --- Real pretrained embedding model (embedding.py) ---
    # Flip to True once you're running somewhere with internet access to
    # huggingface.co. Falls back to k-mer automatically if the checkpoint
    # can't be loaded, so it's always safe to leave True.
    use_pretrained_embeddings: bool = False
    # Verified real HuggingFace checkpoints (as of this writing):
    #   "zhihan1996/DNABERT-S"   <- default. Contrastive model, trained
    #        specifically to separate species cleanly in embedding space —
    #        exactly what this stage needs, since its output feeds
    #        clustering.py's novel-discovery path. Loads via the standard
    #        AutoTokenizer/AutoModel pattern (see embedding.py).
    #   "bioscan-ml/BarcodeBERT" <- alternative, pretrained on barcode-length
    #        (COI-style) sequences. NOTE: its real API is NOT the standard
    #        AutoModel pattern — it requires `BertForTokenClassification` and
    #        reading `output["hidden_states"][-1]`. If you switch to it, you
    #        must also update `_model_embed_batch` in embedding.py to match
    #        (see the model card: https://huggingface.co/bioscan-ml/BarcodeBERT).
    embedding_model_checkpoint: str = "zhihan1996/DNABERT-S"
    embedding_batch_size: int = 32
    embedding_max_length: int = 512

    # Minimum cluster size for HDBSCAN — tune this against real data volume.
    min_cluster_size: int = 3

    class Config:
        env_file = ".env"


settings = Settings()
