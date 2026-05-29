import { useCallback, useRef, useState } from 'react'
import { useStepPlayback } from './useStepPlayback'
import { solveNQueens } from '../algorithms/nqueens'
import type { NQueensStep } from '../algorithms/nqueens'

const NQUEENS_MIN_DELAY = 1
const NQUEENS_MAX_DELAY = 3525
const NQUEENS_INITIAL_SPEED = 89

export type NQueensPlaybackHandle = {
  isRunning: boolean
  currentStep: NQueensStep | null
  stepIndex: number
  stepCount: number
  solutionsFound: number
  isPlaying: boolean
  playbackSpeed: number
  isPlaybackComplete: boolean
  canStepForward: boolean
  canStepBackward: boolean
  canTogglePlay: boolean
  run: () => void
  stop: () => void
  stepForward: () => void
  stepBackward: () => void
  togglePlay: () => void
  setPlaybackSpeed: (v: number) => void
}

// Manages N-Queens backtracking visualization: runs the solver, stores steps, and drives step-by-step playback.
export function useNQueensPlayback({ n }: { n: number }): NQueensPlaybackHandle {
  const [isRunning, setIsRunning] = useState(false)
  const [stepCount, setStepCount] = useState(0)
  const [resetSignal, setResetSignal] = useState(0)

  const resultRef = useRef<NQueensStep[] | null>(null)
  // Precomputed cumulative solution count per step index for O(1) lookup.
  const solutionCumRef = useRef<number[] | null>(null)

  const pb = useStepPlayback({
    stepCount,
    minDelay: NQUEENS_MIN_DELAY,
    maxDelay: NQUEENS_MAX_DELAY,
    initialSpeed: NQUEENS_INITIAL_SPEED,
    resetSignal,
  })

  // Generates all backtracking steps for the current N, precomputes solution counts, and starts playback.
  const run = useCallback(() => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    const steps = solveNQueens(n)
    resultRef.current = steps
    let c = 0
    solutionCumRef.current = steps.map(s => {
      if (s.phase === 'solution') c++
      return c
    })
    setIsRunning(true)
    setStepCount(steps.length)
    setResetSignal(s => s + 1)
  }, [n, pb])

  // Aborts playback and clears all state, returning to idle.
  const stop = useCallback(() => {
    pb.stopPlayback()
    resultRef.current = null
    solutionCumRef.current = null
    setIsRunning(false)
    setStepCount(0)
  }, [pb])

  const currentStep = resultRef.current && pb.stepIndex >= 0
    ? resultRef.current[pb.stepIndex]
    : null

  const solutionsFound = pb.stepIndex >= 0
    ? (solutionCumRef.current?.[pb.stepIndex] ?? 0)
    : 0

  return {
    isRunning,
    currentStep,
    stepIndex: pb.stepIndex,
    stepCount,
    solutionsFound,
    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    isPlaybackComplete: pb.isPlaybackComplete,
    canStepForward: pb.canStepForward,
    canStepBackward: pb.canStepBackward,
    canTogglePlay: pb.canTogglePlay,
    run,
    stop,
    stepForward: pb.stepForward,
    stepBackward: pb.stepBackward,
    togglePlay: pb.togglePlay,
    setPlaybackSpeed: pb.setPlaybackSpeed,
  }
}
