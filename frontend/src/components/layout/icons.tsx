import type { SVGProps } from 'react'

const common: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function SamplesIcon() {
  return (
    <svg {...common}>
      <path d="M4 6h12M4 10h12M4 14h8" />
    </svg>
  )
}

export function AnalyseIcon() {
  return (
    <svg {...common}>
      <path d="M10 3v9M6.5 8.5 10 12l3.5-3.5" />
      <path d="M4 13.5v1a2.5 2.5 0 0 0 2.5 2.5h7a2.5 2.5 0 0 0 2.5-2.5v-1" />
    </svg>
  )
}

export function ResultsIcon() {
  return (
    <svg {...common}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="2" />
      <path d="M3.5 8.5h13M8 8.5V16.5" />
    </svg>
  )
}

export function CompareIcon() {
  return (
    <svg {...common}>
      <circle cx="7.5" cy="10" r="5" />
      <circle cx="12.5" cy="10" r="5" />
    </svg>
  )
}
