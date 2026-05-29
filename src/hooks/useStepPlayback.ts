import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type UseStepPlaybackOptions = {
  // Number of steps (0 disables playback controls).
  stepCount: number
  minDelay: number
  maxDelay: number
  initialSpeed?: number
  // Bump when starting a new run so the hook resets to step -1 (e.g. new traversal result).
  resetSignal?: number
  // Called whenever the step index changes (including -1 for “ready”).
  // Omit when the consumer derives its view straight from stepIndex and needs no notification.
  onStepIndexChange?: (index: number) => void
  // Called when stepping would move past the last step (run finished).
  onComplete?: () => void
}

const noop = () => {}

function getPlaybackDelay(speedValue: number, minDelay: number, maxDelay: number) {
  const speedRatio = speedValue / 100
  return Math.round(maxDelay - speedRatio * (maxDelay - minDelay))
}

// Shared step playback: timer, speed slider mapping, previous / play / next.
// Used by traversal (App) and algorithm mocks (Sidebar).
export function useStepPlayback({
  stepCount,
  minDelay,
  maxDelay,
  initialSpeed = 81,
  resetSignal = 0,
  onStepIndexChange = noop,
  onComplete = noop,
}: UseStepPlaybackOptions) {
  const [stepIndex, setStepIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(initialSpeed)
  const timerRef = useRef<number | null>(null)

  const onStepIndexChangeRef = useRef(onStepIndexChange)
  const onCompleteRef = useRef(onComplete)
  const stepCountRef = useRef(stepCount)
  useLayoutEffect(() => {
    onStepIndexChangeRef.current = onStepIndexChange
    onCompleteRef.current = onComplete
    stepCountRef.current = stepCount
  })

  const clearTimerOnly = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopPlayback = useCallback(() => {
    clearTimerOnly()
    setIsPlaying(false)
  }, [clearTimerOnly])

  const reset = useCallback(() => {
    clearTimerOnly()
    setIsPlaying(false)
    setStepIndex(-1)
    onStepIndexChangeRef.current(-1)
  }, [clearTimerOnly])

  useEffect(() => {
    if (stepCount <= 0) {
      queueMicrotask(() => {
        clearTimerOnly()
        setIsPlaying(false)
        setStepIndex(-1)
      })
      return
    }
    queueMicrotask(() => {
      clearTimerOnly()
      setIsPlaying(false)
      setStepIndex(-1)
      onStepIndexChangeRef.current(-1)
    })
  }, [resetSignal, stepCount, clearTimerOnly])

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    },
    [],
  )

  const startTimer = useCallback(
    (speedOverride?: number) => {
      clearTimerOnly()
      const speed = speedOverride ?? playbackSpeed
      const delayMs = getPlaybackDelay(speed, minDelay, maxDelay)
      timerRef.current = window.setInterval(() => {
        setStepIndex((prev) => {
          const total = stepCountRef.current
          if (total <= 0) return prev
          const next = prev + 1
          if (next >= total) {
            clearTimerOnly()
            setIsPlaying(false)
            onCompleteRef.current()
            return total - 1
          }
          onStepIndexChangeRef.current(next)
          return next
        })
      }, delayMs)
    },
    [clearTimerOnly, maxDelay, minDelay, playbackSpeed],
  )

  const stepForward = useCallback(() => {
    if (stepCount <= 0 || isPlaying) return
    setStepIndex((prev) => {
      const total = stepCountRef.current
      const next = prev + 1
      if (next >= total) {
        onCompleteRef.current()
        return total - 1
      }
      onStepIndexChangeRef.current(next)
      return next
    })
  }, [isPlaying, stepCount])

  const stepBackward = useCallback(() => {
    if (stepCount <= 0 || isPlaying || stepIndex < 0) return
    const prev = stepIndex - 1
    onStepIndexChangeRef.current(prev)
    setStepIndex(prev)
  }, [isPlaying, stepCount, stepIndex])

  const togglePlay = useCallback(() => {
    if (stepCount <= 0) return
    if (isPlaying) {
      stopPlayback()
      return
    }
    if (stepIndex >= stepCount - 1) {
      onStepIndexChangeRef.current(-1)
      setStepIndex(-1)
    }
    setIsPlaying(true)
    startTimer()
  }, [isPlaying, startTimer, stepCount, stepIndex, stopPlayback])

  const setPlaybackSpeedClamped = useCallback(
    (value: number) => {
      const clamped = Math.min(100, Math.max(0, value))
      setPlaybackSpeed(clamped)
      if (!isPlaying || stepCount <= 0) return
      clearTimerOnly()
      startTimer(clamped)
    },
    [clearTimerOnly, isPlaying, startTimer, stepCount],
  )

  const canStepBackward = stepCount > 0 && stepIndex >= 0 && !isPlaying
  const canStepForward = stepCount > 0 && stepIndex < stepCount - 1 && !isPlaying
  const canTogglePlay = stepCount > 0
  const isPlaybackComplete = stepCount > 0 && stepIndex >= stepCount - 1 && !isPlaying

  return {
    stepIndex,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed: setPlaybackSpeedClamped,
    stopPlayback,
    reset,
    stepForward,
    stepBackward,
    togglePlay,
    canStepBackward,
    canStepForward,
    canTogglePlay,
    isPlaybackComplete,
    getPlaybackDelay: (v: number) => getPlaybackDelay(v, minDelay, maxDelay),
  }
}
