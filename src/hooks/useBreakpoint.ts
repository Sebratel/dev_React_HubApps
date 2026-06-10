import { useEffect, useState } from 'react'

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type Breakpoint = keyof typeof BREAKPOINTS

export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const [matches, setMatches] = useState(
    () => window.innerWidth >= BREAKPOINTS[breakpoint]
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINTS[breakpoint]}px)`)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])

  return matches
}

export function useIsMobile(): boolean {
  return !useBreakpoint('md')
}
