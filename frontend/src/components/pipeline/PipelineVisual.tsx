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

/** Pre-wrapped label lines — hand-broken so the eight fixed stage names sit cleanly under/beside each node. */
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

type Lane = 'shared' | 'teal' | 'coral'

interface Segment {
  id: string
  d: string
  length: number
  range: [number, number]
  lane: Lane
}

interface Geometry {
  viewW: number
  viewH: number
  gateR: number
  labelFontSize: number
  gates: Gate[]
  segments: Segment[]
}

function straightPath(x1: number, y1: number, x2: number, y2: number) {
  return `M ${x1} ${y1} L ${x2} ${y2}`
}

/** S-curve bending around a horizontal midpoint — the vertical dip/rise around the confidence split. */
function sCurvePathH(x1: number, y1: number, x2: number, y2: number) {
  const midX = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
}

function cubicPoint(t: number, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) {
  const mt = 1 - t
  const x = mt * mt * mt * x0 + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3
  const y = mt * mt * mt * y0 + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3
  return [x, y] as const
}

function curveLength(midCtrl: (x1: number, y1: number, x2: number, y2: number) => [number, number, number, number], x1: number, y1: number, x2: number, y2: number) {
  const [cx1, cy1, cx2, cy2] = midCtrl(x1, y1, x2, y2)
  let len = 0
  let prev: readonly [number, number] = [x1, y1]
  const samples = 24
  for (let i = 1; i <= samples; i++) {
    const t = i / samples
    const pt = cubicPoint(t, x1, y1, cx1, cy1, cx2, cy2, x2, y2)
    len += Math.hypot(pt[0] - prev[0], pt[1] - prev[1])
    prev = pt
  }
  return len
}

const hCtrl = (x1: number, y1: number, x2: number, y2: number): [number, number, number, number] => {
  const midX = (x1 + x2) / 2
  return [midX, y1, midX, y2]
}

function buildSegments(gates: Gate[]): Segment[] {
  const g = gates
  const dist = (a: Gate, b: Gate) => Math.hypot(b.x - a.x, b.y - a.y)
  return [
    { id: 'seg-0-1', d: straightPath(g[0].x, g[0].y, g[1].x, g[1].y), length: dist(g[0], g[1]), range: [0, 1], lane: 'shared' },
    { id: 'seg-1-2', d: straightPath(g[1].x, g[1].y, g[2].x, g[2].y), length: dist(g[1], g[2]), range: [1, 2], lane: 'shared' },
    { id: 'seg-2-3', d: straightPath(g[2].x, g[2].y, g[3].x, g[3].y), length: dist(g[2], g[3]), range: [2, 3], lane: 'shared' },
    { id: 'seg-teal-bypass', d: straightPath(g[3].x, g[3].y, g[7].x, g[7].y), length: dist(g[3], g[7]), range: [3, 7], lane: 'teal' },
    {
      id: 'seg-coral-fork',
      d: sCurvePathH(g[3].x, g[3].y, g[4].x, g[4].y),
      length: curveLength(hCtrl, g[3].x, g[3].y, g[4].x, g[4].y),
      range: [3, 4],
      lane: 'coral',
    },
    { id: 'seg-4-5', d: straightPath(g[4].x, g[4].y, g[5].x, g[5].y), length: dist(g[4], g[5]), range: [4, 5], lane: 'coral' },
    { id: 'seg-5-6', d: straightPath(g[5].x, g[5].y, g[6].x, g[6].y), length: dist(g[5], g[6]), range: [5, 6], lane: 'coral' },
    {
      id: 'seg-coral-merge',
      d: sCurvePathH(g[6].x, g[6].y, g[7].x, g[7].y),
      length: curveLength(hCtrl, g[6].x, g[6].y, g[7].x, g[7].y),
      range: [6, 7],
      lane: 'coral',
    },
  ]
}

function buildHorizontalGeometry(): Geometry {
  const viewW = 1240
  const viewH = 480
  const centerY = 190
  const lowerY = 350
  const gateX = [70, 227, 384, 541, 698, 855, 1012, 1170]
  const gateY = [centerY, centerY, centerY, centerY, lowerY, lowerY, lowerY, centerY]
  const gates: Gate[] = gateX.map((x, i) => ({ x, y: gateY[i], lines: GATE_LABEL_LINES[i] }))
  return {
    viewW,
    viewH,
    gateR: 20,
    labelFontSize: 13,
    gates,
    segments: buildSegments(gates),
  }
}

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

  const geometry = useMemo(() => buildHorizontalGeometry(), [])
  const { viewW, viewH, gateR, labelFontSize, gates, segments } = geometry

  const reveals = useMemo(() => segments.map((seg) => segReveal(seg.range, clamped)), [segments, clamped])
  const filterStageStatus = stageStatus(4, clamped)
  const stageIdx = currentStageIndex(clamped)
  const stageLabel = currentStageLabel(clamped)

  const dissolveFrom = gates[4]
  const dissolveTo = gates[5]
  const dissolvePoints = [0.25, 0.5, 0.75].map((t) => [lerp(dissolveFrom.x, dissolveTo.x, t), lerp(dissolveFrom.y, dissolveTo.y, t)])

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      className={className}
      role="img"
      aria-label={`Pipeline stage ${stageIdx + 1} of ${PIPELINE_STAGES.length}: ${stageLabel}`}
      style={{ width: '100%', height: 'auto', overflow: 'visible' }}
    >
      <defs>
        {segments.map((seg) => (
          <path key={seg.id} id={seg.id} d={seg.d} fill="none" />
        ))}
      </defs>

      {/* Track guides */}
      {segments.map((seg) => (
        <path key={`track-${seg.id}`} d={seg.d} stroke={palette.track} strokeWidth={5} fill="none" strokeLinecap="round" />
      ))}

      {/* Revealed progress strokes */}
      {segments.map((seg, i) => (
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
        segments.map((seg, i) =>
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
            style={reducedMotion ? { opacity: 0.35 } : ({ animationDelay: `${i * 0.6}s` } as CSSProperties)}
          />
        ))}

      {/* Gate nodes */}
      {gates.map((gate, i) => {
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
              r={gateR}
              fill={fill}
              stroke={stroke}
              strokeWidth={status === 'active' ? 3 : 2}
              className={status === 'active' && !reducedMotion ? 'pipeline-gate-pulse' : undefined}
              style={{ transition: reducedMotion ? undefined : 'fill var(--duration-standard) var(--ease-standard), stroke var(--duration-standard) var(--ease-standard)' }}
            />
            <text x={gate.x} y={gate.y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={labelFontSize} fill={textFill}>
              {i + 1}
            </text>
            {gate.lines.map((line, li) => (
              <text
                key={li}
                x={gate.x}
                y={gate.y + gateR + 18 + li * 15}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize={labelFontSize}
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
