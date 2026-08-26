import type { CSSProperties, ReactNode } from 'react'

/** One element of the once-per-route staggered page-load reveal (§5). */
export function Reveal({ index, children, className = '' }: { index: number; children: ReactNode; className?: string }) {
  return (
    <div className={`reveal-item ${className}`} style={{ '--i': index } as CSSProperties}>
      {children}
    </div>
  )
}
