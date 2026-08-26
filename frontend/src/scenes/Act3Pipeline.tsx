import { useEffect, useRef, useState } from 'react'
import { PipelineVisual } from '../components/pipeline/PipelineVisual'
import { currentStageIndex, currentStageLabel, PIPELINE_STAGES } from '../components/pipeline/pipelineStages'
import { usePrefersReducedMotion } from '../lib/usePrefersReducedMotion'

/**
 * Scroll-to-progress mapping lives HERE, in the scene, not inside
 * PipelineVisual — the component only ever receives a 0..1 `progress` prop
 * so it can be reused status-driven on the Processing screen (§ Phase 3).
 */
function useScrollPinnedProgress(sectionRef: React.RefObject<HTMLDivElement | null>) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    function handleScroll() {
      const el = sectionRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollable = rect.height - window.innerHeight
      if (scrollable <= 0) {
        setProgress(1)
        return
      }
      const traveled = -rect.top
      setProgress(Math.max(0, Math.min(1, traveled / scrollable)))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [sectionRef])

  return progress
}

export function Act3Pipeline() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const scrollProgress = useScrollPinnedProgress(sectionRef)
  const progress = reducedMotion ? 1 : scrollProgress
  const stageIdx = currentStageIndex(progress)

  if (reducedMotion) {
    return (
      <section className="abyss-deep px-6 py-24">
        <div className="mx-auto max-w-[1800px] text-center">
          <p className="font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2">The pipeline</p>
          <h2 className="mt-2 font-display text-3xl text-ink-inv">Known matches move fast. Everything else gets a second look.</h2>
          <div className="mx-auto mt-10 w-[90vw] max-w-[1600px] rounded-card border border-abyss-3 bg-abyss-2 p-8">
            <PipelineVisual progress={1} variant="dark" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="abyss-deep relative" style={{ height: '280vh' }}>
      <div className="sticky top-0 flex h-svh flex-col items-center justify-center px-6">
        <p className="font-mono text-[13px] uppercase tracking-eyebrow text-ink-inv-2">The pipeline</p>
        <h2 className="mt-2 max-w-2xl text-center font-display text-3xl text-ink-inv min-[700px]:text-4xl">
          Known matches move fast. Everything else gets a second look.
        </h2>
        <p aria-live="off" className="mt-2 font-mono text-[12px] text-ink-inv-2">
          stage {stageIdx + 1} of {PIPELINE_STAGES.length} — {currentStageLabel(progress)}
        </p>

        <div className="mx-auto mt-8 w-[90vw] max-w-[1600px] rounded-card border border-abyss-3 bg-abyss-2 p-6 min-[900px]:p-8" style={{ minHeight: '60vh' }}>
          <PipelineVisual progress={progress} variant="dark" />
        </div>

        {stageIdx >= 4 && stageIdx <= 6 && (
          <p className="mt-6 max-w-md text-center font-body text-[14px] text-ink-inv-2">
            Chimeras and contaminants are filtered here — what survives is a genuine candidate, not an artifact.
          </p>
        )}
      </div>
    </section>
  )
}
