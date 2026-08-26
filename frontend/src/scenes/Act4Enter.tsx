import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

export function Act4Enter() {
  const navigate = useNavigate()
  const reducedMotion = usePrefersReducedMotion()
  const [surfacing, setSurfacing] = useState(false)

  function handleBegin() {
    if (reducedMotion) {
      navigate('/analyse')
      return
    }
    setSurfacing(true)
    setTimeout(() => navigate('/analyse'), 650)
  }

  return (
    <section
      className="relative flex min-h-[70svh] flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        backgroundImage: 'linear-gradient(180deg, var(--abyss) 0%, var(--abyss-2) 55%, var(--sand) 220%)',
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Ccircle cx='30' cy='40' r='1.4' fill='%23E3B86B'/%3E%3Ccircle cx='110' cy='20' r='1' fill='%23E3B86B'/%3E%3Ccircle cx='180' cy='80' r='1.6' fill='%23E3B86B'/%3E%3Ccircle cx='60' cy='130' r='1.1' fill='%23E3B86B'/%3E%3Ccircle cx='150' cy='170' r='1.3' fill='%23E3B86B'/%3E%3C/svg%3E\")",
          backgroundSize: '220px 220px',
        }}
      />

      <p className="relative font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2">Ready when you are</p>
      <h2 className="relative mt-2 max-w-lg font-display text-3xl text-ink-inv min-[700px]:text-4xl">
        Upload a sample. See what the databases know — and what they don't.
      </h2>

      <button
        type="button"
        onClick={handleBegin}
        className="hover-lift press-scale relative mt-8 rounded-pill bg-coral px-8 py-4 font-body text-[16px] font-medium text-ink"
      >
        Begin analysis
      </button>

      {surfacing && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[100]"
          style={{
            background: 'var(--shell)',
            animation: 'surface-fade-in 650ms var(--ease-standard) both',
          }}
        />
      )}
    </section>
  )
}
