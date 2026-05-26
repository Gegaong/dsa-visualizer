import { useCallback, useEffect, useRef } from 'react'

const HOLD_DELAY_MS = 400

// After the initial delay: interval steps down at these offsets (ms from repeat start).
// 80ms → 40ms → 20ms → 10ms → 5ms
const SPEED_STEPS: Array<{ at: number; interval: number }> = [
  { at: 0,    interval: 80 },
  { at: 2000, interval: 40 },
  { at: 4000, interval: 20 },
  { at: 6000, interval: 10 },
  { at: 7000, interval: 5  },
]

// Fires callback immediately on press, then repeatedly after an initial delay.
// Repeat interval steps down over time: 80ms → 40ms → 20ms → 10ms → 5ms.
export function useHoldRepeat(callback: () => void, disabled: boolean) {
  const cbRef = useRef(callback)
  useEffect(() => { cbRef.current = callback })

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRef = useRef(false)

  const stop = useCallback(() => {
    activeRef.current = false
    for (const t of timeoutsRef.current) clearTimeout(t)
    timeoutsRef.current = []
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    activeRef.current = true
    cbRef.current()

    const t0 = setTimeout(() => {
      if (!activeRef.current) return

      const switchTo = (ms: number) => {
        if (intervalRef.current !== null) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => cbRef.current(), ms)
      }

      for (const step of SPEED_STEPS) {
        if (step.at === 0) {
          switchTo(step.interval)
        } else {
          timeoutsRef.current.push(
            setTimeout(() => { if (activeRef.current) switchTo(step.interval) }, step.at)
          )
        }
      }
    }, HOLD_DELAY_MS)

    timeoutsRef.current.push(t0)
  }, [disabled])

  useEffect(() => stop, [stop])

  return { onMouseDown: start, onMouseUp: stop, onMouseLeave: stop }
}
