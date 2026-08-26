/** Loading state per the motion budget: a slow seafoam sonar sweep, never a spinner. */
export function SonarLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12" role="status">
      <span className="sonar-sweep" aria-hidden="true" />
      {label && <p className="font-mono text-[13px] text-ink-3">{label}</p>}
    </div>
  )
}
