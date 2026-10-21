import { useEffect, useState } from 'react'

/**
 * Fica true quando `active` continua true por mais de `delay` ms. Serve para
 * avisar que a API está demorando (no plano gratuito do Render ela "dorme").
 */
export function useDelayedFlag(active: boolean, delay: number): boolean {
  const [elapsed, setElapsed] = useState(false)

  useEffect(() => {
    if (!active) return
    const timer = window.setTimeout(() => setElapsed(true), delay)
    return () => {
      window.clearTimeout(timer)
      setElapsed(false)
    }
  }, [active, delay])

  return active && elapsed
}
