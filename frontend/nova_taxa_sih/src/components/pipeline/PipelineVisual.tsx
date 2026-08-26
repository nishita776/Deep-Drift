import { useMemo, type CSSProperties } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import './pipeline.css'
import { PIPELINE_STAGES, currentStageIndex, currentStageLabel, stageStatus } from './pipelineStages'

export interface PipelineVisualProps {
  /** 0..1 across the whole pipeline. The component never reads scroll or time itself — callers drive this. */
  progress: number
  variant?: 'light' | 'dark'
  className?: string
}

const VIEW_W = 1240
const VIEW_H = 300
const CENTER_Y = 118
const LOWER_Y = 214
const GATE_R = 17

const GATE_X = [70, 227, 384, 541, 698, 855, 1012, 1170]
const GATE_Y = [CENTER_Y, CENTER_Y, CENTER_Y, CENTER_Y, LOWER_Y, LOWER_Y, LOWER_Y, CENTER_Y]

/** Pre-wrapped label lines — hand-broken so the eight fixed stage names sit cleanly under each node. */
const GATE_LABEL_LINES: string[][] = [
  ['Sequencing', '& QC'],
  ['ASV', 'Generation'],
  ['Reference', 'Search'],
  ['Confidence', 'Split'],
  ['Artifact &', 'Contamination Filter'],
  ['Embedding + HDBSCAN', 'Clustering'],
  ['Novelty', 'Scoring'],
  ['Biodiversity', 'Metrics'],
]

interface Gate {
  x: number
  y: number
  lines: string[]
}

const GATES: Gate[] = GATE_X.map((x, i) => ({ x, y: GATE_Y[i], lines: GATE_LABEL_LINES[i] }))

type Lane = 'shared' | 'teal' | 'coral'

interface Segment {
  id: string
  d: string
  length: number
  range: [number, number]
  lane: Lane
}

function straightPath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

function sCurvePath(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
}

function cubicPoint(t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  const mt = 1 - t
  const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
  const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
  return [x, y] as const
}

function sCurveLength(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2
  let len = 0
  let prev: readonly [number, number] = [x1, y1]
  const samples = 24
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const pt = cubicPoint(t, x1, y1, midX, y1, midX, y2, x2, y2)
    len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1])
    prev = pt
  }
  return len
}

function buildSegments(): Segment[] {
  const g = GATES
  const dist = (a: Gate, b: Gate) => Math.hypot(b.x - a.x, b.y - a.y)
  return [
    { id: 'seg-0-1', d: straightPath(g[0].x, g[0].y, g[1].x, g[1].y), length: dist(g[0], g[1]), range: [0, 1], lane: 'shared' },
    { id: 'seg-1-2', d: straightPath(g[1].x, g[1].y, g[2].x, g[2].y), length: dist(g[1], g[2]), range: [1, 2], lane: 'shared' },
    { id: 'seg-2-3', d: straightPath(g[2].x, g[2].y, g[3].x, g[3].y), length: dist(g[2], g[3]), range: [2, 3], lane: 'shared' },
    { id: 'seg-teal-bypass', d: straightPath(g[3].x, g[3].y, g[7].x, g[7].y), length: dist(g[3], g[7]), range: [3, 7], lane: 'teal' },
    {
      id: 'seg-coral-fork',
      d: sCurvePath(g[3].x, g[3].y, g[4].x, g[4].y),
      length: sCurveLength(g[3].x, g[3].y, g[4].x, g[4].y),
      range: [3, 4],
      lane: 'coral',
    },
    { id: 'seg-4-5', d: straightPath(g[4].x, g[4].y, g[5].x, g[5].y), length: dist(g[4], g[5]), range: [4, 5], lane: 'coral' },
    { id: 'seg-5-6', d: straightPath(g[5].x, g[5].y, g[6].x, g[6].y), length: dist(g[5], g[6]), range: [5, 6], lane: 'coral' },
    {
      id: 'seg-coral-merge',
      d: sCurvePath(g[6].x, g[6].y, g[7].x, g[7].y),
      length: sCurveLength(g[6].x, g[6].y, g[7].x, g[7].y),
      range: [6, 7],
      lane: 'coral',
    },
  ]
}

const SEGMENTS = buildSegments()

function segReveal(range: [number, number], progress: number): number {
  const p = progress * PIPELINE_STAGES.length
  const [a, b] = range
  if (p <= a) return 0
  if (p >= b) return 1
  return (p - a) / (b - a)
}

function laneColor(lane: Lane): string {
  return lane === 'coral' ? 'var(--coral)' : 'var(--teal)'
}

const PALETTE = {
  light: {
    track: 'var(--border)',
    surface: 'var(--surface)',
    textPending: 'var(--ink-3)',
    textActive: 'var(--ink)',
    label: 'var(--ink-2)',
  },
  dark: {
    track: 'var(--abyss-3)',
    surface: 'var(--abyss-2)',
    textPending: 'var(--ink-inv-2)',
    textActive: 'var(--ink-inv)',
    label: 'var(--ink-inv-2)',
  },
} as const

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function PipelineVisual({ progress, variant = 'light', className }: PipelineVisualProps) {
  const clamped = Math.max(0, Math.min(1, progress))
  const reducedMotion = usePrefersReducedMotion()
  const palette = PALETTE[variant]

  const reveals = useMemo(() => SEGMENTS.map((seg) => segReveal(seg.range, clamped)), [clamped])
  const filterStageStatus = stageStatus(4, clamped)
  const stageIdx = currentStageIndex(clamped)
  const stageLabel = currentStageLabel(clamped)

  const dissolveFrom = GATES[4]
  const dissolveTo = GATES[5]
  const dissolvePoints = [0.25, 0.5, 0.75].map((t) => [
    lerp(dissolveFrom.x, dissolveTo.x, t),
    lerp(dissolveFrom.y, dissolveTo.y, t),
  ])

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={className}
      role="img"
      aria-label={`Pipeline stage ${stageIdx + 1} of ${PIPELINE_STAGES.length}: ${stageLabel}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
    >
      <defs>
        {SEGMENTS.map((seg) => (
          <path key={seg.id} id={seg.id} d={seg.d} fill="none" />
        ))}
      </defs>

      {/* Track guides */}
      {SEGMENTS.map((seg) => (
        <path key={`track-${seg.id}`} d={seg.d} stroke={palette.track} strokeWidth={5} fill="none" strokeLinecap="round" />
      ))}

      {/* Revealed progress strokes */}
      {SEGMENTS.map((seg, i) => (
        <path
          key={`fill-${seg.id}`}
          d={seg.d}
          stroke={laneColor(seg.lane)}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={seg.length}
          strokeDashoffset={seg.length * (1 - reveals[i])}
          style={reducedMotion ? undefined : { transition: 'stroke-dashoffset var(--duration-standard) var(--ease-standard)' }}
        />
      ))}

      {/* Ambient particles flowing along any segment that has started revealing */}
      {!reducedMotion &&
        SEGMENTS.map((seg, i) =>
          reveals[i] > 0
            ? [0, 1].map((p) => (
                <circle key={`${seg.id}-particle-${p}`} r={3.4} fill={laneColor(seg.lane)} opacity={0.85}>
                  <animateMotion dur={`${2.6 + p * 0.4}s`} begin={`${p * 1.3}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={`#${seg.id}`} />
                  </animateMotion>
                </circle>
              ))
            : null,
        )}

      {/* The thesis beat: candidate reads dissolving at the artifact/contamination filter */}
      {filterStageStatus !== 'pending' &&
        dissolvePoints.map(([x, y], i) => (
          <circle
            key={`dissolve-${i}`}
            cx={x}
            cy={y}
            r={4}
            fill="var(--coral)"
            className={reducedMotion ? undefined : 'pipeline-dissolve-dot'}
            style={
              reducedMotion
                ? { opacity: 0.35 }
                : ({ animationDelay: `${i * 0.6}s` } as CSSProperties)
            }
          />
        ))}

      {/* Gate nodes */}
      {GATES.map((gate, i) => {
        const status = stageStatus(i, clamped)
        const isCoralLane = i >= 4 && i <= 6
        const accent = isCoralLane ? 'var(--coral)' : 'var(--teal)'
        const fill = status === 'complete' ? accent : palette.surface
        const stroke = status === 'pending' ? palette.track : accent
        const textFill = status === 'complete' ? (isCoralLane ? 'var(--ink)' : 'var(--shell)') : status === 'active' ? palette.textActive : palette.textPending

        return (
          <g key={`gate-${i}`}>
            <circle
              cx={gate.x}
              cy={gate.y}
              r={GATE_R}
              fill={fill}
              stroke={stroke}
              strokeWidth={status === 'active' ? 3 : 2}
              className={status === 'active' && !reducedMotion ? 'pipeline-gate-pulse' : undefined}
              style={{ transition: reducedMotion ? undefined : 'fill var(--duration-standard) var(--ease-standard), stroke var(--duration-standard) var(--ease-standard)' }}
            />
            <text x={gate.x} y={gate.y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={11} fill={textFill}>
              {i + 1}
            </text>
            {gate.lines.map((line, li) => (
              <text
                key={li}
                x={gate.x}
                y={gate.y + GATE_R + 16 + li * 13}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={10.5}
                letterSpacing="0.02em"
                fill={palette.label}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

export { PIPELINE_STAGES }
