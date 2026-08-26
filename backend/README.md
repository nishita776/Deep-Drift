# NovaTaxa Backend — DJS_26_SW_15

AI-driven taxonomy and biodiversity discovery from deep-sea eDNA. This is
the backend only — your 3 teammates build the frontend against the API
described below.

## Quick start (local, no Docker)

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open **http://127.0.0.1:8000/docs** — that's the live, interactive API
reference (Swagger UI). Send this link to your frontend teammates on day
one; they can explore and test every endpoint from the browser before
your pipeline logic is even finished.

Uses SQLite (`dev.db`) by default — zero setup required.

## Quick start (Docker, matches production shape)

```bash
docker compose up --build
```

This runs FastAPI + Postgres together. Same API, same docs URL.

## Running the tests

```bash
python3 tests/fixtures/make_fixture.py   # generates a synthetic test FASTQ (already committed, but regenerate if you change it)
pytest tests/ -v
```

All 10 tests should pass, including a full end-to-end pipeline run
through the real API (upload → run → poll status → fetch results).

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/samples` | Upload a FASTQ file + metadata (name, sample_type, marker_gene). Returns `sample_id`. |
| POST | `/samples/{id}/run` | Kicks off the pipeline in the background. Returns `job_id`. |
| GET | `/jobs/{job_id}/status` | Poll this — `pending` / `running` / `done` / `failed`. |
| GET | `/samples/{id}/results` | Confident-match known taxa table. |
| GET | `/samples/{id}/novel-clusters` | Candidate-novel clusters with novelty scores. |
| GET | `/samples/{id}/biodiversity` | Shannon, Simpson, richness, rarefaction curve. |
| GET | `/samples/compare?ids=a,b,c` | Cross-sample biodiversity comparison. |

`sample_type` should be `"field"` for real samples or `"blank"` for lab
controls — blanks are used automatically to subtract contamination from
real samples (see `app/pipeline/artifact_filter.py`).

`marker_gene` should be `"18S"` or `"COI"` — **run these as separate
samples with separate reference sets**, never mixed in one run.

## What's real vs. placeholder in this pipeline

Being upfront about this matters — if you present this, don't overclaim
what's running under the hood right now:

| Stage | Status |
|---|---|
| QC & ASV generation (`qc.py`) | Real logic (quality trimming, length filtering, dereplication), simplified vs. full DADA2. |
| Reference search (`reference_search.py`) | Real k-mer Jaccard similarity search — **not** BLAST/VSEARCH identity%. Reference set is now marker-gene-specific (`reference_fasta_for()` in `config.py`); see "Building a real reference database" below. |
| Artifact/contamination filter (`artifact_filter.py`) | Real, working chimera-detection heuristic + blank subtraction logic. |
| Embedding (`embedding.py`) | **Real model wired up** (`zhihan1996/DNABERT-S` via HuggingFace `transformers`), gated behind `USE_PRETRAINED_EMBEDDINGS=true`. Falls back automatically to k-mer frequency vectors if that env var is off, or if the checkpoint can't load (no internet, no torch, etc.) — so local dev/CI/offline demos still run with zero setup. See "Turning on the real embedding model" below. |
| Clustering (`clustering.py`) | Real HDBSCAN (via `sklearn.cluster.HDBSCAN`) — this part is production-grade as-is. |
| Taxonomic placement (`taxonomic_placement.py`) | Real nearest-neighbor search in embedding space — explicitly NOT true phylogenetic placement (that needs a tool like EPA-ng). |
| Novelty scoring (`novelty_score.py`) | Real relative calibration within one sample/run — not a cross-study statistical p-value. |
| Biodiversity metrics (`biodiversity.py`) | Real, standard formulas (Shannon, Simpson, richness, rarefaction) — production-grade as-is. |

### Turning on the real embedding model

This sandbox environment that generated this code has no network access
to huggingface.co, so the model swap-in below is written but has never
actually been exercised here — do this on a machine with normal internet:

```bash
pip install -r requirements.txt   # now includes torch, transformers, einops
export USE_PRETRAINED_EMBEDDINGS=true
uvicorn app.main:app --reload
```

First pipeline run will download `zhihan1996/DNABERT-S` (~470MB) from
HuggingFace and cache it. If the checkpoint fails to load for any reason,
`embedding.py` logs a warning and falls back to k-mer vectors automatically
— the pipeline never crashes because of this, so it's safe to leave the
flag on even before you've confirmed it works.

`zhihan1996/DNABERT-S` was chosen over BarcodeBERT because it's a
contrastive model trained specifically to separate species cleanly in
embedding space — exactly what this stage needs, since its output feeds
the novel-discovery clustering path. If you want BarcodeBERT instead
(better for barcode-length COI reads specifically), note its HuggingFace
API is different (`BertForTokenClassification` + `hidden_states` dict,
not the standard `AutoModel`/`last_hidden_state` pattern) — see the
comment in `config.py` and update `_model_embed_batch()` in
`embedding.py` to match before switching.

### Building a real reference database

```bash
pip install requests biopython
python scripts/build_reference_db.py --marker both --limit-per-taxon 100
```

This downloads real sequences — SILVA SSU (18S, via the DADA2-formatted
Zenodo export, CC-BY 4.0) and BOLD Systems COI barcodes (queried live per
marine phylum) — and writes `app/data/reference_18s.fasta` /
`reference_coi.fasta` in the header format the pipeline expects. Once
those files exist, `config.reference_fasta_for()` picks them up
automatically per sample's `marker_gene` — no code changes needed. Same
caveat as above: this script has not been run in the sandbox that
generated this code (no network access to zenodo.org / boldsystems.org
here), so run it yourself and sanity-check the output FASTA before your
demo. `--limit-per-taxon` controls how many sequences per phylum get
kept — raise it for more coverage, lower it to keep the file small.

### Before treating results as scientifically meaningful, you still need to:
1. Run `scripts/build_reference_db.py` (above) and re-run it periodically as SILVA/BOLD update.
2. Confirm `USE_PRETRAINED_EMBEDDINGS=true` actually loaded the real model (check the startup logs for "Loaded embedding checkpoint" vs. the fallback warning).
3. Re-derive `CONFIDENT_MATCH_THRESHOLD` and the novelty-score calibration against real alignment output and held-out known taxa, rather than trusting the current placeholder constants — this doesn't change just because the reference data and embeddings are now real.

None of that blocks the demo — the pipeline runs correctly end-to-end
right now on the k-mer/toy-data fallback path with zero setup, and every
"swap to real" step above is now wired in and one command away rather
than a TODO comment.

## For your frontend teammates

- CORS is wide open (`allow_origins=["*"]`) — no config needed to hit this from any local dev server.
- The pipeline is slow-ish (real sequence work), so `/samples/{id}/run` returns immediately with a `job_id` — **poll `/jobs/{job_id}/status` until it's `done`**, don't expect results synchronously.
- Every response model is documented and typed in `/docs` — build against that rather than asking me for a schema doc that'll go stale.
