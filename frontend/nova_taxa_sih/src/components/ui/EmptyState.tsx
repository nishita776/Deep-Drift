export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" stroke="var(--seafoam)" strokeWidth="1.5" aria-hidden="true">
        <path d="M48 20c-14 0-24 10-24 22 0 9 6 15 12 15h24c6 0 12-6 12-15 0-12-10-22-24-22Z" />
        <path d="M34 57v14M42 57v18M50 57v14M58 57v18M66 57v14" strokeLinecap="round" />
        <circle cx="40" cy="34" r="1.6" fill="var(--seafoam)" />
        <circle cx="56" cy="34" r="1.6" fill="var(--seafoam)" />
      </svg>
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-xs text-[14px] text-ink-3">{description}</p>
    </div>
  )
}
