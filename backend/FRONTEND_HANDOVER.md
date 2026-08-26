# NovaTaxa Backend — Frontend Handover

Base URL (local dev): `http://127.0.0.1:8000`
Live interactive docs (test any endpoint by hand): `http://127.0.0.1:8000/docs`

CORS is already open for all origins, so you can call this directly from
the frontend dev server without any proxy config.

---

## The flow, in order

1. **Upload** a FASTQ file → get back a `sample_id`.
2. **Trigger the pipeline run** for that sample → get back a `job_id`.
3. **Poll job status** until it's `"done"` (or `"failed"`).
4. **Fetch results** — known taxa, novel clusters, biodiversity metrics.
5. Optionally: **compare** multiple samples, or **export** a report.

Everything after step 1 depends on `sample_id`. Keep it in state as soon as
upload succeeds.

---

## 1. Upload a sample

```
POST /samples
Content-Type: multipart/form-data
```

**Form fields:**
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | Display name, e.g. "Station 4 - 200m" |
| `sample_type` | string | no (default `"field"`) | `"field"` or `"blank"` (a `"blank"` is a lab control sample, used internally for contamination filtering) |
| `marker_gene` | string | no (default `"18S"`) | Must be `"18S"` or `"COI"` — anything else gets rejected with a 422 |
| `file` | file | yes | The FASTQ file |

**Response `200`:**
```json
{
  "id": "a4d35f36-f116-460c-a633-6239e5df7376",
  "name": "Station 4 - 200m",
  "sample_type": "field",
  "marker_gene": "18S",
  "status": "uploaded"
}
```
Save `id` — this is your `sample_id` for every subsequent call.

**Error case:** `422` if `marker_gene` isn't `"18S"`/`"COI"`.

---

## 2. Trigger the pipeline run

```
POST /samples/{sample_id}/run
```
No body needed. Returns immediately (doesn't wait for the pipeline to finish — it runs in the background).

**Response `200`:**
```json
{
  "id": "17a69252-ed4c-4d42-b931-f19c3c5034a8",
  "sample_id": "a4d35f36-f116-460c-a633-6239e5df7376",
  "status": "pending",
  "error_log": null
}
```
Save `id` — this is your `job_id`.

**Error case:** `404` if `sample_id` doesn't exist.

---

## 3. Poll job status

```
GET /jobs/{job_id}/status
```

**Response `200`:**
```json
{
  "id": "17a69252-ed4c-4d42-b931-f19c3c5034a8",
  "sample_id": "a4d35f36-f116-460c-a633-6239e5df7376",
  "status": "done",
  "error_log": null
}
```

`status` is one of: `"pending"` → `"running"` → `"done"` or `"failed"`.

**Suggested polling pattern:** poll every 1–2 seconds until status is
`"done"` or `"failed"`. On a small demo-sized FASTQ this typically finishes
in a few seconds. If `status == "failed"`, show `error_log` to the user
(or at least log it to the console) rather than a silent failure.

---

## 4. Get results

### 4a. Known taxa (confident matches)

```
GET /samples/{sample_id}/results
```

**Response `200`:**
```json
{
  "sample": {
    "id": "a4d35f36-...",
    "name": "Station 4 - 200m",
    "sample_type": "field",
    "marker_gene": "18S",
    "status": "done"
  },
  "known_taxa": [
    {
      "asv_id": "a56c43da-...",
      "sequence_preview": "GGCTACCACATCTAAGGAAGGCAGCAGG...",
      "count": 1,
      "status": "confident_match",
      "matched_taxon": "ref2|Arthropoda|Copepoda|known_copepod_sp",
      "identity_score": 0.857,
      "database_source": "sample_reference.fasta",
      "conservation_status": "unknown"
    }
  ],
  "total_reads": 38
}
```

Notes for the UI:
- `matched_taxon` is a pipe-delimited string: `id|Phylum|Class|species_label`. You'll likely want to split this client-side into separate table columns rather than showing the raw string.
- `identity_score` is 0–1 (not a percentage) — multiply by 100 for display if you want "%".
- `sequence_preview` is truncated (40 chars + "...") — it's for a tooltip/detail view, not the main table.
- `conservation_status` is one of `LC | NT | VU | EN | CR | DD | unknown` — an IUCN Red List category from a **curated static table** (`app/data/conservation_status.json`, keyed on the `species_label` segment of `matched_taxon`), **not a live IUCN lookup**. Defaults to `"unknown"` for anything not in the table — this is intentional, not a bug, since most reference-FASTA labels are accession-derived (18S) or unassessed obscure taxa (COI toy set), not real species names worth guessing a status for. Surface this provenance in the UI (a footnote near wherever the status is shown), not just in code — don't let it read as a live feed.

### 4b. Candidate novel clusters

```
GET /samples/{sample_id}/novel-clusters
```

**Response `200`** (array, sorted by novelty score descending):
```json
[
  {
    "id": "c1a2...",
    "placeholder_id": "Cluster_001",
    "rank_prediction": "Unresolved beyond domain Eukaryota (sim=0.33)",
    "nearest_reference": "ref5|Annelida|Polychaeta|known_worm_sp",
    "novelty_score": 1.0,
    "member_count": 10,
    "total_reads": 10
  }
]
```

Important UI framing: **never let this render as a species name.**
`placeholder_id` (e.g. "Cluster_001") is intentionally generic — the whole
point of this feature is that it's a *candidate*, not a confirmed new
species. Show `rank_prediction` as-is (it already includes a confidence
caveat in the string, e.g. "low confidence") rather than reformatting it
into something more definitive-sounding.

`novelty_score` is 0 (looks basically known) to 1 (looks very novel) — a
good UI treatment is a sorted list with the score as a visual bar/badge,
not a raw decimal.

### 4c. Biodiversity metrics

```
GET /samples/{sample_id}/biodiversity
```

**Response `200`:**
```json
{
  "shannon": 2.5083,
  "simpson": 0.8891,
  "richness": 20,
  "rarefaction_curve": {
    "depths": [1, 5, 10, 20, 38],
    "richness": [1, 4, 8, 15, 20]
  }
}
```

`rarefaction_curve` is ready to feed directly into a line chart:
`depths` = x-axis (sequencing depth), `richness` matching values = y-axis.

**Error case:** `409` if the pipeline hasn't finished yet — check job
status is `"done"` before calling this (or handle the 409 gracefully with
a "still processing" message).

---

## 5. Compare multiple samples

```
GET /samples/compare?ids=abc,def,ghi
```
Comma-separated `sample_id`s in the query string.

**Response `200`:**
```json
{
  "abc": {
    "name": "Station 1",
    "status": "done",
    "biodiversity": { "shannon": 2.1, "simpson": 0.85, "richness": 15, "rarefaction_curve": {...} }
  },
  "def": {
    "name": "Station 2",
    "status": "done",
    "biodiversity": null
  }
}
```
`biodiversity` is `null` if that sample's pipeline hasn't finished (or hasn't run at all) — handle that case in the UI (e.g. gray out that sample in the comparison chart) rather than assuming it's always present.

---

## 6. Export a report (CSV / Excel)

```
GET /samples/{sample_id}/export?format=csv
GET /samples/{sample_id}/export?format=xlsx
```

This is a **file download**, not JSON — trigger it with a plain link/anchor
tag or `window.location`, not a fetch-and-parse-JSON call:

```html
<a href="http://127.0.0.1:8000/samples/{sample_id}/export?format=csv" download>
  Download CSV
</a>
```
or in React, just point a button's `onClick` at `window.open(url)`.

- `format=csv` → one file with three sections (Known Taxa / Novel Clusters / Biodiversity), each with its own header row.
- `format=xlsx` → same data as a 3-sheet Excel workbook (cleaner for anyone opening it in Excel/Google Sheets directly).

`format` defaults to `csv` if omitted. Invalid `format` values return `422`.

---

## Quick reference table

| Method | Path | Purpose | Returns |
|---|---|---|---|
| POST | `/samples` | Upload FASTQ + metadata | `sample_id` |
| POST | `/samples/{id}/run` | Start pipeline | `job_id` |
| GET | `/jobs/{job_id}/status` | Poll progress | status string |
| GET | `/samples/{id}/results` | Known taxa table | JSON |
| GET | `/samples/{id}/novel-clusters` | Candidate novel clusters | JSON array |
| GET | `/samples/{id}/biodiversity` | Diversity metrics + rarefaction curve | JSON |
| GET | `/samples/compare?ids=a,b,c` | Cross-sample comparison | JSON |
| GET | `/samples/{id}/export?format=csv\|xlsx` | Downloadable report | file |

---

## Suggested screen → endpoint mapping

- **Upload screen** → `POST /samples`, then immediately `POST /samples/{id}/run`, then start polling.
- **Processing/loading screen** → poll `GET /jobs/{job_id}/status` (show a spinner + maybe narrate the 8 pipeline stages from the architecture slide while waiting).
- **Results dashboard, tab 1 "Known Taxa"** → `GET /samples/{id}/results`.
- **Results dashboard, tab 2 "Candidate Novel Taxa"** → `GET /samples/{id}/novel-clusters`.
- **Results dashboard, tab 3 "Biodiversity"** → `GET /samples/{id}/biodiversity` (bar/pie for Shannon/Simpson/richness, line chart for the rarefaction curve).
- **Comparison view** (optional/stretch) → `GET /samples/compare`.
- **"Export Report" button** on the dashboard → the two export links above.

---

## Things that will bite you if you don't know about them

1. **Everything is async.** Never assume results exist right after calling `/run` — always poll status first. Calling `/results`, `/novel-clusters`, or `/biodiversity` before the job is `"done"` won't crash, but biodiversity specifically returns `409` if metrics aren't computed yet.
2. **`marker_gene` is validated strictly** — only `"18S"` or `"COI"` (case-insensitive), anything else is a `422` at upload time, so validate this client-side too before submitting.
3. **IDs are UUID strings, not integers** — don't parse them as numbers.
4. **The export endpoint is a real file download**, not a JSON API call — don't try to `fetch()` + `JSON.parse()` it.

If anything here doesn't match what you're actually seeing from a live
call, the interactive docs at `/docs` are the source of truth — they're
generated straight from the running code, so they can't go stale like
this document can.
