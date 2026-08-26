import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useSampleStore } from '../../store/useSampleStore'
import { ApiModeBadge } from './ApiModeBadge'
import { AnalyseIcon, CompareIcon, ResultsIcon, SamplesIcon } from './icons'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-control px-3 py-2.5 font-body text-[15px] transition-colors min-[900px]:w-full ${
    isActive ? 'bg-seafoam-pale text-teal-deep' : 'text-ink-2 hover:bg-surface-sunk hover:text-ink'
  }`

export function AppShell() {
  const navigate = useNavigate()
  const samples = useSampleStore((s) => s.samples)

  function goToResults() {
    if (samples.length > 0) {
      navigate(`/results/${samples[0].sampleId}/overview`)
    } else {
      navigate('/samples')
    }
  }

  return (
    <div className="marine-snow min-h-svh bg-shell min-[900px]:flex">
      <nav
        aria-label="Primary"
        className="sticky top-0 z-40 flex items-center justify-between gap-1 overflow-x-auto border-b border-border-soft bg-surface/90 px-3 py-2 backdrop-blur min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-svh min-[900px]:w-[220px] min-[900px]:flex-none min-[900px]:flex-col min-[900px]:items-stretch min-[900px]:justify-start min-[900px]:gap-2 min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:px-4 min-[900px]:py-6"
      >
        <Link
          className="hidden font-display text-xl tracking-display text-ink min-[900px]:mb-4 min-[900px]:block"
          to="/"
        >
          DeepDrift
        </Link>

        <ApiModeBadge />

        <NavLink to="/samples" className={navLinkClass}>
          <SamplesIcon />
          <span>Samples</span>
        </NavLink>
        <NavLink to="/analyse" className={navLinkClass}>
          <AnalyseIcon />
          <span>Analyse</span>
        </NavLink>
        <button type="button" onClick={goToResults} className={navLinkClass({ isActive: false })}>
          <ResultsIcon />
          <span>Results</span>
        </button>
        <NavLink to="/compare" className={navLinkClass}>
          <CompareIcon />
          <span>Compare</span>
        </NavLink>
      </nav>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
