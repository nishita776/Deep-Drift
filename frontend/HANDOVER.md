# Backend handover

> **The app defaults to `VITE_API_MODE=mock`.** Whenever mock mode is
> active, the nav shows an unmissable sand "● Mock data" badge — not
> dev-gated, always visible, so nobody mistakes canned data for a live
> backend. Once you switch to `http` mode (§2 below), that badge is
> replaced by a live reachability pill (reachable/unreachable + the actual
> error), so a dead backend is obvious instead of silent.

DeepDrift's frontend is built against a mock adapter
([`src/api/mock.ts`](src/api/mock.ts)) that mirrors the real FastAPI
backend's contract exactly. Everything you need to plug your backend in
instead is on this page.

## 1. Install and run the frontend

```bash
npm install
cp .env.example .env.local   # defaults to mock mode
npm run dev
```

Open the printed local URL. In mock mode (the default) the app runs
end-to-end with no backend at all, so you can see the intended behavior
before connecting anything. A **Dev tools** panel in the bottom right (dev
builds only) lets you force failed/slow jobs and empty/large result sets
while in mock mode, and — once you're in `http` mode — ping your backend.

## 2. Point it at your backend

The **only** change required is environment variables — no component code
changes, because every screen imports the API through
[`src/api/client.ts`](src/api/client.ts), which picks an implementation
based on `VITE_API_MODE` and never leaks which one is active.

1. Set `VITE_API_MODE=http` in `.env.local`.
2. Set `VITE_API_BASE` to your backend's URL.
   - Same machine as the frontend: `http://127.0.0.1:8000` (the default).
   - **Different machine** (your laptop, a VM, etc.): `VITE_API_BASE` must
     point at *that machine's* address — not `127.0.0.1`, which would
     resolve to the frontend's own machine — e.g. `http://192.168.1.42:8000`.
   - Your backend's CORS config must allow the frontend's origin, or every
     request fails in the browser with a CORS error even though the backend
     is reachable.
3. Restart `npm run dev` (Vite only reads `.env*` files at startup).
4. Open the Dev tools panel and click **Ping backend**. In `http` mode this
   calls `GET {API_BASE}/docs` and reports reachable/unreachable with the
   underlying error — a misconfigured `VITE_API_BASE` or a CORS block
   surfaces in seconds instead of an evening of guessing.

`src/api/mock.ts` stays in the build permanently — flip `VITE_API_MODE`
back to `mock` at any point (e.g. if the backend goes down during judging)
and everything keeps working.

## 3. Endpoint → screen → fields checklist

| # | Endpoint | Screen(s) | Fields this frontend reads |
|---|----------|-----------|------------------------------|
| 1 | `POST /samples` | [NewAnalysis](src/screens/NewAnalysis.tsx) | `id`, `name`, `marker_gene`, `sample_type`, `status` |
| 2 | `POST /samples/{id}/run` | [NewAnalysis](src/screens/NewAnalysis.tsx) (initial run), [Processing](src/screens/Processing.tsx) (Retry), [Samples](src/screens/Samples.tsx) (Re-run) | `id` (job id), `status`, `error_log` |
| 3 | `GET /jobs/{job_id}/status` | [Processing](src/screens/Processing.tsx) — polled every 1500ms | `status`, `error_log` |
| 4 | `GET /samples/{id}/results` | [ResultsLayout](src/screens/results/ResultsLayout.tsx) (header stat cards), [KnownTaxaTab](src/screens/results/KnownTaxaTab.tsx), [HeatmapTab](src/screens/results/HeatmapTab.tsx), [NetworkTab](src/screens/results/NetworkTab.tsx), [OverviewTab](src/screens/results/OverviewTab.tsx) | `sample.name`, `sample.marker_gene`, `sample.sample_type`, `total_reads`, and per row: `asv_id`, `sequence_preview`, `count`, `matched_taxon`, `identity_score`, `database_source`, `conservation_status`. `known_taxa[].status` is received but **not yet surfaced in the UI** — free to ignore or extend. `conservation_status` (`LC\|NT\|VU\|EN\|CR\|DD\|unknown`) is from a curated static table on the backend, not a live IUCN lookup — the UI footnote in KnownTaxaTab says so explicitly; keep that framing if you extend it. |
| 5 | `GET /samples/{id}/novel-clusters` | [NovelClustersTab](src/screens/results/NovelClustersTab.tsx) | `id`, `placeholder_id`, `rank_prediction`, `nearest_reference`, `novelty_score`, `member_count`, `total_reads` |
| 6 | `GET /samples/{id}/biodiversity` | [BiodiversityTab](src/screens/results/BiodiversityTab.tsx) | `shannon`, `simpson`, `richness`, `rarefaction_curve.depths`, `rarefaction_curve.richness` |
| 7 | `GET /samples/compare?ids=` | [Compare](src/screens/Compare.tsx) | per sample id: `name`, `status`, `biodiversity` (or `null`) |
| 8 | `GET /samples/{id}/export?format=` | [ResultsLayout](src/screens/results/ResultsLayout.tsx), [Samples](src/screens/Samples.tsx) | Never fetched — only used to build a URL for `<a download>` / `window.open`. |

`src/api/types.ts` has the exact TypeScript shape for all eight — it's a
line-for-line transcription of the contract, so it doubles as documentation.

**No new endpoints exist for the Heatmap, Network, and Overview tabs** — all
three are pure frontend derivations computed client-side from `known_taxa`
(row 4) and `novel-clusters` (row 5), via the shared helpers in
`src/lib/taxonomy.ts`. Nothing to add on the backend for these.

## 4. The four known bite-points

1. **Everything is async — always poll before fetching results.** The
   mock's job lifecycle (`pending → running → done|failed`) takes several
   real seconds, same as the contract implies for the live backend. If your
   backend resolves near-instantly for small test files, the polling loop
   in `Processing.tsx` still works — it just finishes fast. Don't add a
   fast-path that skips polling; `GET /biodiversity` will 409 if you do.

2. **IDs are UUID strings, never parsed as numbers.** Every `id`,
   `sample_id`, and `job_id` in this codebase is typed `string` and passed
   straight into URL paths — nothing does `parseInt` or numeric comparison
   on them. If your backend ever returns a non-UUID string id, nothing
   breaks; if it returns a numeric id as a JSON number instead of a string,
   `sample.id` typing would need loosening.

3. **`marker_gene` is strict `'18S' | 'COI'`.** The upload form only offers
   those two as a segmented control, so a 422 from your backend should be
   unreachable in normal use — but `NewAnalysis.tsx`'s submit handler still
   catches `ApiError` with `status === 422` and surfaces the message inline,
   in case your backend enforces something the client doesn't (e.g. rejects
   an empty file).

4. **Export is a file download, not a JSON call.** `api.getExportUrl()`
   only builds the URL string — `{API_BASE}/samples/{id}/export?format=csv`
   — it never calls `fetch`. In `http` mode the frontend creates a temporary
   `<a download>` and clicks it. In `mock` mode (no file server behind that
   URL) it instead shows the constructed URL in a dev notice so the
   integration is still verifiable without a real download. If your export
   endpoint requires an auth header rather than being a plain
   unauthenticated GET, `<a download>` won't carry it — that would need a
   signed-URL or blob-fetch approach instead.

## 5. Other things worth knowing before you connect

- **`sample` inside `GET /results` is loosely typed.** The contract shows it
  as `{...}` — this frontend only reads `id`, `name`, `sample_type`,
  `marker_gene`, `status` off it (see row 4 in the table above). Extra
  fields on your real response are ignored, not an error.
- **The mock's `error_log` text is invented**, formatted like a Python
  traceback for a contamination-threshold failure. Your backend's real
  `error_log` strings will look different — `Processing.tsx` just renders
  whatever string it's given in a `<pre>` block, so no assumption about its
  format needs to change.
- **CORS**: the mock never touches the network, so this only bites in
  `http` mode. If **Ping backend** in the Dev tools panel reports
  "unreachable" but the backend is definitely running, CORS is the first
  thing to check (browser devtools Network tab will show a blocked
  preflight, not a 4xx/5xx).
