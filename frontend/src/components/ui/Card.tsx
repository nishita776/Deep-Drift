import type { HTMLAttributes } from 'react'

export function Card({ className = '', style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card border border-border bg-surface ${className}`}
      style={{ boxShadow: 'var(--shadow-card), var(--shadow-inset-top)', ...style }}
      {...props}
    />
  )
}
