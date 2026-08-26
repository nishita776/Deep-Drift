import { useId, useState } from 'react'

/** Accessible, keyboard-reachable definition tooltip for first-use jargon (§10). */
export function Tip({ term, definition }: { term: string; definition: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border border-border-soft font-mono text-[10px] text-ink-3 hover:border-teal hover:text-teal"
      >
        ?<span className="sr-only">{`What is ${term}?`}</span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-control border border-border bg-ink px-3 py-2 text-left font-body text-[13px] leading-snug text-shell shadow-card"
        >
          {definition}
        </span>
      )}
    </span>
  )
}
