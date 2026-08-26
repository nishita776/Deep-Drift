export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  name,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  name: string
}) {
  return (
    <div role="radiogroup" aria-label={name} className="inline-flex rounded-pill border border-border bg-surface-sunk p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-pill px-4 py-1.5 font-mono text-[13px] tracking-mono-label transition-colors ${
            value === opt.value ? 'bg-teal text-shell' : 'text-ink-2 hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
