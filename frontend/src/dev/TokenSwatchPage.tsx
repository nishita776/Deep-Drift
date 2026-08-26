import { api, API_MODE } from '../api/client'
import { useEffect, useState } from 'react'

const colorTokens = [
  ['shell', '--shell'],
  ['surface', '--surface'],
  ['surface-sunk', '--surface-sunk'],
  ['border', '--border'],
  ['border-soft', '--border-soft'],
  ['ink', '--ink'],
  ['ink-2', '--ink-2'],
  ['ink-3', '--ink-3'],
  ['teal', '--teal'],
  ['teal-deep', '--teal-deep'],
  ['seafoam', '--seafoam'],
  ['seafoam-pale', '--seafoam-pale'],
  ['coral', '--coral'],
  ['coral-soft', '--coral-soft'],
  ['sand', '--sand'],
  ['kelp', '--kelp'],
  ['abyss', '--abyss'],
  ['abyss-2', '--abyss-2'],
  ['abyss-3', '--abyss-3'],
  ['ink-inv', '--ink-inv'],
  ['ink-inv-2', '--ink-inv-2'],
] as const

const spaceTokens = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16, 20, 24, 32]

/**
 * Scratch verification route — not a product screen. Confirms every token
 * in tokens.css resolves to a real value and that the mock adapter returns
 * correctly-typed data. Delete or gate behind DEV once Phase 5 is underway.
 */
export function TokenSwatchPage() {
  const [mockCheck, setMockCheck] = useState<string>('loading…')

  useEffect(() => {
    api
      .createSample({ name: 'swatch-check', marker_gene: '18S', file: new File(['x'], 'x.fastq') })
      .then((sample) => setMockCheck(`OK — created sample ${sample.id} (${sample.status})`))
      .catch((err) => setMockCheck(`ERROR — ${String(err)}`))
  }, [])

  return (
    <div style={{ padding: 'var(--space-8)', maxWidth: 960, margin: '0 auto' }}>
      <p style={{ fontFamily: 'var(--font-mono)', letterSpacing: 'var(--tracking-eyebrow)', textTransform: 'uppercase', fontSize: 13, color: 'var(--ink-3)' }}>
        Phase 1 · Foundation verification
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, letterSpacing: 'var(--tracking-display)' }}>
        Token swatch
      </h1>

      <section style={{ marginTop: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>
          API adapter — mode: <code style={{ fontFamily: 'var(--font-mono)' }}>{API_MODE}</code>
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{mockCheck}</p>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>Colour</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
          {colorTokens.map(([label, varName]) => (
            <div key={varName}>
              <div
                style={{
                  height: 64,
                  borderRadius: 'var(--radius-control)',
                  background: `var(${varName})`,
                  border: '1px solid var(--border)',
                }}
              />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>Typography</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, letterSpacing: 'var(--tracking-display)' }}>
          Fraunces — The deep sea keeps its own census.
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}>
          Figtree — A scientist uploads raw sequencing reads; the pipeline matches what the reference databases know.
        </p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 14, letterSpacing: 'var(--tracking-mono-label)' }}>
          IBM Plex Mono — ASV_0001 · identity_score 0.97 · Cluster_001 · novelty_score 0.88
        </p>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>Radius</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          {(['radius-card', 'radius-control', 'radius-pill'] as const).map((r) => (
            <div key={r} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 96,
                  height: 64,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: `var(--${r})`,
                  boxShadow: 'var(--shadow-card)',
                }}
              />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 4 }}>{r}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>Spacing (4pt scale)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {spaceTokens.map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, width: 90 }}>--space-{n}</span>
              <div style={{ width: `var(--space-${n})`, height: 12, background: 'var(--teal)' }} />
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-8)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>
          Tailwind theme mapping
        </h2>
        <div id="tw-check" className="bg-teal text-shell rounded-card font-display p-4 shadow-card">
          bg-teal / text-shell / rounded-card / font-display / shadow-card
        </div>
      </section>

      <section style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, marginBottom: 'var(--space-3)' }}>Shadow &amp; focus ring</h2>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div
            style={{
              width: 160,
              height: 80,
              background: 'var(--surface)',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
            }}
          />
          <button
            type="button"
            style={{
              fontFamily: 'var(--font-body)',
              padding: '10px 20px',
              borderRadius: 'var(--radius-control)',
              border: 'none',
              background: 'var(--coral)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Focus me (Tab)
          </button>
        </div>
      </section>
    </div>
  )
}
