import { useEffect, useState, type RefObject } from 'react'

/** Fires once, the first time the element enters the viewport, then disconnects. */
export function useInViewOnce<T extends HTMLElement>(ref: RefObject<T | null>, threshold = 0.35): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || inView) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, inView, threshold])

  return inView
}
