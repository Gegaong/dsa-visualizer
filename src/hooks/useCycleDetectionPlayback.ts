import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type {
  GraphNode,
  GraphEdge,
} from '../types'
import type {
  CycleDetectionResult,
  TraversalStrategy,
} from '../algorithms/algorithmstypes'
import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'
import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
} from '../utils/constants'
import { runCycleDetection } from '../algorithms/cycleDetection'
import {
  buildCycleDetectionCompletionStatus,
  formatCycleNodeLabels,
} from '../algorithms/cycleDetectionUIHelpers'
import { useStepPlayback } from './useStepPlayback'

// Returns the uppercase strategy label used in status messages.
function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

type TraversalVisualSetters = {
  setTraversalVisitedNodeIds: (ids: string[]) => void
  setTraversalCurrentNodeId: (id: string | null) => void
  setTraversalStartNodeId: (id: string | null) => void
  setTraversalGoalNodeIds: (ids: string[]) => void
}

type UseCycleDetectionPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  traversalVisualSetters: TraversalVisualSetters
  onResetTraversal: () => void
}

export type CycleOutput = {
  hasCycle: boolean
  cycleNodeLabels: string[]
} | null

export type CycleDetectionPlaybackHandle = {
  cycleDetectionResult: CycleDetectionResult | null
  isCycleDetectionRunning: boolean
  cycleDetectionStatusText: string

  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  cycleOutput: CycleOutput

  resetCycleDetectionVisualization: () => void
  clearCycleDetectionAlgorithmStateOnly: () => void
  runCycleDetectionFromSidebar: (strategy: TraversalStrategy) => void
  handleAlgorithmModeChangeFromSidebar: (mode: AlgorithmMode) => void
  stepCycleDetectionForward: () => void
  stepCycleDetectionBackward: () => void
  playCycleDetection: () => void
  pauseCycleDetection: () => void
  handleCycleDetectionPlaybackSpeedChange: (value: number) => void
  canRunCycleDetection: boolean
}

// Manages cycle detection algorithm state, playback controls, and canvas visual updates.
export function useCycleDetectionPlayback({
  nodes,
  edges,
  traversalVisualSetters,
  onResetTraversal,
}: UseCycleDetectionPlaybackParams): CycleDetectionPlaybackHandle {
  const {
    setTraversalVisitedNodeIds,
    setTraversalCurrentNodeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  } = traversalVisualSetters

  const [cycleDetectionResult, setCycleDetectionResult] =
    useState<CycleDetectionResult | null>(null)
  const cycleDetectionResultRef = useRef<CycleDetectionResult | null>(null)
  const cycleDetectionStrategyRef = useRef<TraversalStrategy>('bfs')
  const sidebarAlgorithmModeRef = useRef<AlgorithmMode>('components')
  const finalizeCycleDetectionRunRef = useRef<(r: CycleDetectionResult) => void>(() => {})
  const cycleDetectionPlaybackStopRef = useRef(() => {})
  const [cycleDetectionPlaybackSession, setCycleDetectionPlaybackSession] = useState(0)
  const [isCycleDetectionRunning, setIsCycleDetectionRunning] = useState(false)
  const [cycleDetectionStatusText, setCycleDetectionStatusText] = useState(
    'Select BFS or DFS, then run cycle detection.',
  )

  useEffect(() => {
    cycleDetectionResultRef.current = cycleDetectionResult
  }, [cycleDetectionResult])

  // Applies a step index to the canvas: updates visited nodes, current node, and status text.
  const applyCycleDetectionStepIndex = (result: CycleDetectionResult, index: number) => {
    const strategyLabel = bfsDfsLabel(cycleDetectionStrategyRef.current)
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setCycleDetectionStatusText(
        `Cycle detection (${strategyLabel}) ready. Press Play or step through manually.`,
      )
      return
    }

    const boundedIndex = Math.min(index, result.steps.length - 1)
    const currentStep = result.steps[boundedIndex]
    const visitedIds = result.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)

    setTraversalCurrentNodeId(currentStep.nodeId)
    setTraversalVisitedNodeIds(visitedIds)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setCycleDetectionStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
    )
  }

  const cycleDetectionPlayback = useStepPlayback({
    stepCount: cycleDetectionResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: cycleDetectionPlaybackSession,
    onStepIndexChange: (index) => {
      const r = cycleDetectionResultRef.current
      if (!r) return
      applyCycleDetectionStepIndex(r, index)
    },
    onComplete: () => {
      const r = cycleDetectionResultRef.current
      if (r) finalizeCycleDetectionRunRef.current(r)
    },
  })

  useEffect(() => {
    finalizeCycleDetectionRunRef.current = (result: CycleDetectionResult) => {
      cycleDetectionPlayback.stopPlayback()
      setTraversalCurrentNodeId(null)
      setTraversalStartNodeId(null)
      // Reveal the detected cycle with the same blue "goal" highlight used by traversals.
      setTraversalGoalNodeIds(result.hasCycle ? result.cycleNodeIds : [])
      setCycleDetectionStatusText(buildCycleDetectionCompletionStatus(result, nodes))
    }
  }, [cycleDetectionPlayback, nodes, setTraversalCurrentNodeId, setTraversalStartNodeId, setTraversalGoalNodeIds])

  useEffect(() => {
    cycleDetectionPlaybackStopRef.current = () => cycleDetectionPlayback.stopPlayback()
  }, [cycleDetectionPlayback])

  // Stops playback and clears the stored result, incrementing the session to reset the step index.
  const clearCycleDetectionPlaybackAndResult = useCallback(() => {
    cycleDetectionPlaybackStopRef.current()
    setCycleDetectionResult(null)
    setCycleDetectionPlaybackSession((s) => s + 1)
  }, [])

  // Full reset: clears playback, result, all canvas highlights, and status text.
  const resetCycleDetectionVisualization = useCallback(() => {
    clearCycleDetectionPlaybackAndResult()
    setTraversalVisitedNodeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setCycleDetectionStatusText('Select BFS or DFS, then run cycle detection.')
    setIsCycleDetectionRunning(false)
  }, [
    clearCycleDetectionPlaybackAndResult,
    setTraversalVisitedNodeIds,
    setTraversalCurrentNodeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  ])

  // Clears algorithm state without resetting canvas visuals (used when switching away mid-run).
  const clearCycleDetectionAlgorithmStateOnly = useCallback(() => {
    clearCycleDetectionPlaybackAndResult()
    setIsCycleDetectionRunning(false)
  }, [clearCycleDetectionPlaybackAndResult])

  // Resets cycle detection when switching away from the cycle mode tab.
  const handleAlgorithmModeChangeFromSidebar = useCallback(
    (mode: AlgorithmMode) => {
      const prev = sidebarAlgorithmModeRef.current
      sidebarAlgorithmModeRef.current = mode
      if (prev === mode) return
      const leavingCycle = prev === 'cycle' && mode !== 'cycle'
      const cycleActive = cycleDetectionResult !== null || isCycleDetectionRunning
      if (leavingCycle || cycleActive) {
        resetCycleDetectionVisualization()
      }
    },
    [cycleDetectionResult, isCycleDetectionRunning, resetCycleDetectionVisualization],
  )

  // Runs cycle detection with the given strategy and initialises the playback session.
  const runCycleDetectionFromSidebar = (strategy: TraversalStrategy) => {
    if (cycleDetectionPlayback.isPlaying) return
    cycleDetectionPlaybackStopRef.current()
    onResetTraversal()

    cycleDetectionStrategyRef.current = strategy

    if (nodes.length === 0) {
      setCycleDetectionStatusText('Add nodes to the canvas first.')
      return
    }

    const result = runCycleDetection(nodes, edges, strategy)
    if (result.steps.length === 0) {
      setCycleDetectionStatusText('Cycle detection could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    setCycleDetectionResult(result)
    setCycleDetectionPlaybackSession((s) => s + 1)
    setIsCycleDetectionRunning(true)
    setCycleDetectionStatusText(
      `Cycle detection (${strategyLabel}) ready. Press Play or step through manually.`,
    )
  }

  // Advances playback by one step.
  const stepCycleDetectionForward = () => {
    if (!cycleDetectionResult) return
    cycleDetectionPlayback.stepForward()
  }

  // Rewinds playback by one step and marks the session as still running.
  const stepCycleDetectionBackward = () => {
    if (!cycleDetectionResult) return
    cycleDetectionPlayback.stepBackward()
    setIsCycleDetectionRunning(true)
  }

  // Starts or resumes auto-play; restarts from the beginning if already at the last step.
  const playCycleDetection = () => {
    if (!cycleDetectionResult) return
    const replayFromEnd =
      cycleDetectionPlayback.stepIndex >= cycleDetectionResult.steps.length - 1
    cycleDetectionPlayback.togglePlay()
    if (replayFromEnd) {
      setIsCycleDetectionRunning(true)
    }
  }

  // Pauses auto-play without resetting the current step.
  const pauseCycleDetection = () => {
    cycleDetectionPlayback.stopPlayback()
  }

  // Updates the playback speed from the sidebar speed slider.
  const handleCycleDetectionPlaybackSpeedChange = (value: number) => {
    cycleDetectionPlayback.setPlaybackSpeed(value)
  }

  const canRunCycleDetection = nodes.length > 0

  const cycleOutput: CycleOutput =
    cycleDetectionResult !== null
      ? {
          hasCycle: cycleDetectionResult.hasCycle,
          cycleNodeLabels: formatCycleNodeLabels(cycleDetectionResult, nodes),
        }
      : null

  return {
    cycleDetectionResult,
    isCycleDetectionRunning,
    cycleDetectionStatusText,

    isPlaying: cycleDetectionPlayback.isPlaying,
    playbackSpeed: cycleDetectionPlayback.playbackSpeed,
    stepIndex: cycleDetectionPlayback.stepIndex,
    canStepBackward: cycleDetectionResult !== null && cycleDetectionPlayback.canStepBackward,
    canStepForward: cycleDetectionResult !== null && cycleDetectionPlayback.canStepForward,
    canTogglePlay: cycleDetectionResult !== null && cycleDetectionPlayback.canTogglePlay,
    isPlaybackComplete:
      cycleDetectionResult !== null && cycleDetectionPlayback.isPlaybackComplete,

    cycleOutput,

    resetCycleDetectionVisualization,
    clearCycleDetectionAlgorithmStateOnly,
    runCycleDetectionFromSidebar,
    handleAlgorithmModeChangeFromSidebar,
    stepCycleDetectionForward,
    stepCycleDetectionBackward,
    playCycleDetection,
    pauseCycleDetection,
    handleCycleDetectionPlaybackSpeedChange,
    canRunCycleDetection,
  }
}
