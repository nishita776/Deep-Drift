"""
Stage 4: Deep Sequence Embedding.

Real BarcodeBERT / DNABERT-S inference via HuggingFace `transformers`.
Loaded lazily and cached at module level so the (large) model is loaded
once per process, not once per read.

This sandbox has no network access to huggingface.co, so this code path
cannot be exercised or downloaded here — but it is the real production
implementation, not a stub. Run it on a machine with normal internet
access (your laptop, a GPU box, an EC2 instance, etc.) and it will
download the checkpoint on first use like any other `transformers` model.

If `settings.use_pretrained_embeddings` is False, OR the model fails to
load (no internet, checkpoint not found, no torch installed), this falls
back automatically to a k-mer frequency vector — same interface, so nothing
downstream ever breaks. This means:
  - Local dev / CI / hackathon demo with no internet: works, using k-mer.
  - Deployed with internet + a real checkpoint name: works, using the
    real model, with ZERO code changes elsewhere in the pipeline.
"""
import logging
import numpy as np
from itertools import product
from app.config import settings

logger = logging.getLogger(__name__)

_BASES = "ACGT"


def _all_kmers(k: int) -> list[str]:
    return ["".join(p) for p in product(_BASES, repeat=k)]


_KMER_INDEX = {kmer: i for i, kmer in enumerate(_all_kmers(settings.kmer_size))}

# ---------------------------------------------------------------------------
# Real model loading (lazy + cached). Only imports torch/transformers if
# use_pretrained_embeddings is actually turned on, so this module still
# imports cleanly on machines that don't have those packages installed.
# ---------------------------------------------------------------------------
_model_cache: dict = {}


def _load_model():
    """Loads (and caches) the tokenizer + model for settings.embedding_model_checkpoint.
    Returns None if loading fails for any reason — caller falls back to k-mer."""
    checkpoint = settings.embedding_model_checkpoint
    if checkpoint in _model_cache:
        return _model_cache[checkpoint]

    try:
        import torch
        from transformers import AutoTokenizer, AutoModel

        tokenizer = AutoTokenizer.from_pretrained(checkpoint, trust_remote_code=True)
        model = AutoModel.from_pretrained(checkpoint, trust_remote_code=True)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model = model.to(device).eval()

        _model_cache[checkpoint] = (tokenizer, model, device, torch)
        logger.info("Loaded embedding checkpoint %s on %s", checkpoint, device)
        return _model_cache[checkpoint]
    except Exception:
        # No internet, checkpoint typo'd, torch not installed, OOM, etc.
        # Log once loudly, then let every subsequent call fall back silently
        # (don't spam the log for every read in a large batch).
        logger.warning(
            "Could not load embedding checkpoint '%s' — falling back to "
            "k-mer frequency embeddings. This is fine for local dev/demo, "
            "but scientific results should use the real model. "
            "See app/pipeline/embedding.py.",
            checkpoint, exc_info=True,
        )
        _model_cache[checkpoint] = None
        return None


def _kmer_embed_sequence(sequence: str) -> np.ndarray:
    """Fallback: normalized k-mer frequency vector. Captures real local
    sequence composition but is NOT a substitute for a pretrained model's
    biological representation power."""
    k = settings.kmer_size
    vec = np.zeros(len(_KMER_INDEX), dtype=np.float64)
    sequence = sequence.upper()

    total = 0
    for i in range(len(sequence) - k + 1):
        kmer = sequence[i:i + k]
        idx = _KMER_INDEX.get(kmer)
        if idx is not None:  # skip k-mers containing N or other ambiguity codes
            vec[idx] += 1
            total += 1

    if total > 0:
        vec /= total  # normalize so embeddings are comparable across different read lengths
    return vec


def _model_embed_batch(sequences: list[str]) -> np.ndarray | None:
    """Real model inference, batched. Returns None if the model isn't
    available (caller falls back to k-mer)."""
    loaded = _load_model()
    if loaded is None:
        return None
    tokenizer, model, device, torch = loaded

    vectors = []
    batch_size = settings.embedding_batch_size
    with torch.no_grad():
        for i in range(0, len(sequences), batch_size):
            batch = sequences[i:i + batch_size]
            inputs = tokenizer(
                batch, return_tensors="pt", padding=True, truncation=True,
                max_length=settings.embedding_max_length,
            ).to(device)
            outputs = model(**inputs)
            # Mean-pool token embeddings, masking out padding tokens.
            hidden = outputs.last_hidden_state                      # (batch, seq, dim)
            mask = inputs["attention_mask"].unsqueeze(-1).float()   # (batch, seq, 1)
            pooled = (hidden * mask).sum(1) / mask.sum(1).clamp(min=1e-9)
            vectors.append(pooled.cpu().numpy())
    return np.vstack(vectors)


def embed_sequence(sequence: str) -> np.ndarray:
    """Single-sequence convenience wrapper around embed_batch."""
    return embed_batch([sequence])[0]


def embed_batch(sequences: list[str]) -> np.ndarray:
    """Returns a 2D array of embeddings, one row per input sequence.

    Uses the real pretrained model when settings.use_pretrained_embeddings
    is True and the checkpoint loads successfully; otherwise falls back to
    k-mer frequency vectors. Same return shape either way, so clustering.py,
    taxonomic_placement.py, etc. never need to know which path ran.
    """
    if not sequences:
        return np.empty((0, 0))

    if settings.use_pretrained_embeddings:
        result = _model_embed_batch(sequences)
        if result is not None:
            return result

    return np.vstack([_kmer_embed_sequence(s) for s in sequences])
