import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react'

import type { BfsStep } from '../algorithms/algorithmstypes'

import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
} from '../utils/constants'

import { useStepPlayback } from './useStepPlayback'

export type TraversalVisualSetters = {
  setTraversalVisitedNodeIds: (ids: string[]) => void
  setTraversalVisitedEdgeIds: (ids: string[]) => void
  setTraversalCurrentNodeId: (id: string | null) => void
  setTraversalCurrentEdgeId: (id: string | null) => void
  setTraversalStartNodeId: (id: string | null) => void
  setTraversalGoalNodeIds: (ids: string[]) => void
  setTraversalFrontierNodeIds: (ids: string[]) => void
}

export type UseAlgorithmPlaybackOptions<TResult extends { steps: BfsStep[] }> = {
  modeKey: AlgorithmMode
  traversalVisualSetters: TraversalVisualSetters
  // Called on every step index change; apply visuals for that step.
  onApplyStep: (result: TResult, index: number) => void
  // Called by resetVisualization after traversal visuals are cleared and isRunning is set false.
  // Responsible for: resetting status text and wiping algorithm-specific extra state.
  onResetVisualization: () => void
  // Called by clearStateOnly after clearPlaybackAndResult and isRunning=false.
  // Responsible for: wiping algorithm-specific extra state only (no status text, no traversal visuals).
  onClearStateOnly: () => void
  // Called on step-backward and play-from-end to clear completion highlights (e.g. cycle goal edges).
  onClearCompletion?: () => void
}

export type AlgorithmPlaybackHandle<TResult> = {
  result: TResult | null
  isRunning: boolean
  setResult: Dispatch<SetStateAction<TResult | null>>
  setIsRunning: Dispatch<SetStateAction<boolean>>
  // Increment to reset the step index to -1 for a new run.
  startNewSession: () => void
  // Expose so runFromSidebar can stop a previous run before computing a new result.
  stopPlayback: () => void
  // Algorithm hooks write their completion logic here via useEffect once pb is available.
  finalizeRef: MutableRefObject<(r: TResult) => void>

  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  clearPlaybackAndResult: () => void
  resetVisualization: () => void
  clearStateOnly: () => void
  handleAlgorithmModeChange: (mode: AlgorithmMode) => void
  stepForward: () => void
  stepBackward: () => void
  play: () => void
  pause: () => void
  setPlaybackSpeed: (v: number) => void
}

// Shared playback scaffold for all graph algorithm hooks (connected components, cycle detection, etc.).
// Manages result, session, isRunning, mode-change reset, and all playback controls.
// Each algorithm hook provides onApplyStep, reset callbacks, and writes completion logic to finalizeRef.
export function useAlgorithmPlayback<TResult extends { steps: BfsStep[] }>({
  modeKey,
  traversalVisualSetters,
  onApplyStep,
  onResetVisualization,
  onClearStateOnly,
  onClearCompletion,
}: UseAlgorithmPlaybackOptions<TResult>): AlgorithmPlaybackHandle<TResult> {
  const {
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
    setTraversalFrontierNodeIds,
  } = traversalVisualSetters

  const [result, setResult] = useState<TResult | null>(null)
  const resultRef = useRef<TResult | null>(null)
  const sidebarAlgorithmModeRef = useRef<AlgorithmMode>(modeKey)
  const [playbackSession, setPlaybackSession] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // Written by the algorithm hook via useEffect after pb is initialised.
  const finalizeRef = useRef<(r: TResult) => void>(() => {})
  // Internal indirection so onComplete in useStepPlayback can reach the latest finalize + stopPlayback.
  const internalFinalizeRef = useRef<(r: TResult) => void>(() => {})

  // Keep callback refs current so closures in useCallback/useEffect never go stale.
  const onApplyStepRef = useRef(onApplyStep)
  const onResetVisualizationRef = useRef(onResetVisualization)
  const onClearStateOnlyRef = useRef(onClearStateOnly)
  const onClearCompletionRef = useRef(onClearCompletion)
  useLayoutEffect(() => {
    onApplyStepRef.current = onApplyStep
    onResetVisualizationRef.current = onResetVisualization
    onClearStateOnlyRef.current = onClearStateOnly
    onClearCompletionRef.current = onClearCompletion
  })

  useEffect(() => {
    resultRef.current = result
  }, [result])

  const playback = useStepPlayback({
    stepCount: result?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: playbackSession,
    onStepIndexChange: (index) => {
      const r = resultRef.current
      if (!r) return
      onApplyStepRef.current(r, index)
    },
    onComplete: () => {
      const r = resultRef.current
      if (r) internalFinalizeRef.current(r)
    },
  })

  // Update internalFinalizeRef whenever playback or shared setters change.
  useEffect(() => {
    internalFinalizeRef.current = (r: TResult) => {
      playback.stopPlayback()
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalStartNodeId(null)
      setTraversalFrontierNodeIds([])
      finalizeRef.current(r)
    }
  }, [playback, setTraversalCurrentNodeId, setTraversalCurrentEdgeId, setTraversalStartNodeId, setTraversalFrontierNodeIds])

  // Stops playback, clears the result, and resets the step index for the next run.
  const clearPlaybackAndResult = useCallback(() => {
    playback.stopPlayback()
    setResult(null)
    setPlaybackSession((s) => s + 1)
  }, [playback])

  // Full reset: stops playback, clears all canvas traversal state, and delegates status text and extra state wipe to onResetVisualization.
  const resetVisualization = useCallback(() => {
    clearPlaybackAndResult()
    setTraversalVisitedNodeIds([])
    setTraversalVisitedEdgeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalCurrentEdgeId(null)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setTraversalFrontierNodeIds([])
    setIsRunning(false)
    onResetVisualizationRef.current()
  }, [
    clearPlaybackAndResult,
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
    setTraversalFrontierNodeIds,
  ])

  // Minimal clear: stops playback and wipes extra state without touching canvas traversal visuals.
  const clearStateOnly = useCallback(() => {
    clearPlaybackAndResult()
    setIsRunning(false)
    onClearStateOnlyRef.current()
  }, [clearPlaybackAndResult])

  // Resets visualization when navigating away from this algorithm's sidebar tab.
  const handleAlgorithmModeChange = useCallback(
    (mode: AlgorithmMode) => {
      const prev = sidebarAlgorithmModeRef.current
      sidebarAlgorithmModeRef.current = mode
      if (prev === mode) return
      if (prev === modeKey && mode !== modeKey) {
        resetVisualization()
      }
    },
    [modeKey, resetVisualization],
  )

  // Increments the session counter, which resets the step index to -1 in useStepPlayback.
  const startNewSession = useCallback(() => {
    setPlaybackSession((s) => s + 1)
  }, [])

  // Advances playback by one step.
  const stepForward = useCallback(() => {
    if (!result) return
    playback.stepForward()
  }, [result, playback])

  // Rewinds playback by one step, marks session as running, and clears completion highlights.
  const stepBackward = useCallback(() => {
    if (!result) return
    playback.stepBackward()
    setIsRunning(true)
    onClearCompletionRef.current?.()
  }, [result, playback])

  // Starts or resumes auto-play; restarts from the beginning if already at the last step.
  const play = useCallback(() => {
    if (!result) return
    const replayFromEnd = playback.stepIndex >= result.steps.length - 1
    playback.togglePlay()
    if (replayFromEnd) {
      setIsRunning(true)
      onClearCompletionRef.current?.()
    }
  }, [result, playback])

  // Pauses auto-play without resetting the current step.
  const pause = useCallback(() => {
    playback.stopPlayback()
  }, [playback])

  // Updates the playback speed from the sidebar speed slider.
  const setPlaybackSpeed = useCallback(
    (value: number) => {
      playback.setPlaybackSpeed(value)
    },
    [playback],
  )

  return {
    result,
    isRunning,
    setResult,
    setIsRunning,
    startNewSession,
    stopPlayback: playback.stopPlayback,
    finalizeRef,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    stepIndex: playback.stepIndex,
    canStepBackward: result !== null && playback.canStepBackward,
    canStepForward: result !== null && playback.canStepForward,
    canTogglePlay: result !== null && playback.canTogglePlay,
    isPlaybackComplete: result !== null && playback.isPlaybackComplete,

    clearPlaybackAndResult,
    resetVisualization,
    clearStateOnly,
    handleAlgorithmModeChange,
    stepForward,
    stepBackward,
    play,
    pause,
    setPlaybackSpeed,
  }
}
