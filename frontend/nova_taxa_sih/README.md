# DeepDrift

AI-driven eDNA biodiversity platform for deep-sea marine samples (CMLRE / SIH 2026).
React + Vite + TypeScript, built against a mock adapter that mirrors the real
FastAPI backend's contract exactly — see [HANDOVER.md](HANDOVER.md) for
connecting it.

## Install and run

```bash
npm install
cp .env.example .env.local   # already defaults to mock mode
npm run dev
```

Open the printed local URL. The app runs entirely on the mock adapter by
default — no backend required. A small **Dev tools** panel in the bottom
right (dev builds only) lets you force failed / slow jobs and empty / large
result sets, and ping a real backend once you're in `http` mode.

Other scripts:

```bash
npm run build     # tsc -b && vite build
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Switching to the live backend

See [HANDOVER.md](HANDOVER.md) — it covers the environment variables,
same-machine-vs-different-machine addressing, CORS, and the connection
check, plus the endpoint-by-endpoint contract checklist for whoever is
wiring up the real backend.

## Project structure

```
src/api/        Two ApiClient implementations (mock.ts, http.ts) behind one
                 interface (client.ts) + the contract's types (types.ts)
src/theme/      tokens.css (every design token) + backgrounds/motion CSS
src/components/ Reusable UI (ui/), the eight-stage pipeline (pipeline/),
                 the app shell/nav (layout/), and the dev-only tools panel
src/store/      zustand + localStorage: sample history, novel-cluster review ledger
src/scenes/     The four-act homepage ("The Descent")
src/screens/    The app screens: New Analysis, Processing, Results (3 tabs),
                 Compare, Samples
src/lib/        Small framework-free helpers (formatting, glossary, hooks)
src/dev/        Dev-only verification routes (/dev/tokens, /dev/pipeline)
```

## Tech

React 18 + Vite + TypeScript · Tailwind v4 (theme generated from
`tokens.css`, no separate config file) · zustand + persist · d3-shape ·
Canvas 2D (homepage particles only) · `@tanstack/react-virtual` (large result
tables).
