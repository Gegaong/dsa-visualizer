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

import { runCycleDetection } from '../algorithms/cycleDetection'

import {
  buildCycleDetectionCompletionStatus,
  formatCycleNodeLabels,
} from '../algorithms/cycleDetectionUIHelpers'

import {
  useAlgorithmPlayback,
  type TraversalVisualSetters,
} from './useAlgorithmPlayback'

// Returns the uppercase strategy label used in status messages.
function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

const IDLE_STATUS = 'Select BFS or DFS, then run cycle detection (Directed canvas).'

type UseCycleDetectionPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isUndirectedMode: boolean
  traversalVisualSetters: TraversalVisualSetters
  onResetTraversal: () => void
}

export type CycleOutput = {
  hasCycle: boolean
  cycleNodeLabels: string[]
  operationCount: number
} | null

export type CycleDetectionPlaybackHandle = {
  cycleDetectionResult: CycleDetectionResult | null
  isCycleDetectionRunning: boolean
  cycleDetectionStatusText: string
  cycleDetectionCurrentExplanation: string
  cycleGoalEdgeIds: string[]
  cycleDetectionStartNodeLabel: string

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
  handleCycleDetectionStartNodeLabelChange: (value: string) => void
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
  isUndirectedMode,
  traversalVisualSetters,
  onResetTraversal,
}: UseCycleDetectionPlaybackParams): CycleDetectionPlaybackHandle {
  const {
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
    setTraversalFrontierNodeIds,
  } = traversalVisualSetters

  const [statusText, setStatusText] = useState(IDLE_STATUS)
  const [cycleGoalEdgeIds, setCycleGoalEdgeIds] = useState<string[]>([])
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const strategyRef = useRef<TraversalStrategy>('bfs')

  // Clears the algorithm-specific extra state shared by all reset paths.
  const clearExtras = useCallback(() => {
    setCycleGoalEdgeIds([])
  }, [])

  const pb = useAlgorithmPlayback<CycleDetectionResult>({
    modeKey: 'cycle',
    traversalVisualSetters,
    onApplyStep: (result, index) => {
      const strategyLabel = bfsDfsLabel(strategyRef.current)
      if (index < 0) {
        setTraversalCurrentNodeId(null)
        setTraversalCurrentEdgeId(null)
        setTraversalVisitedNodeIds([])
        setTraversalVisitedEdgeIds([])
        setTraversalFrontierNodeIds([])
        setTraversalStartNodeId(null)
        setTraversalGoalNodeIds([])
        setCycleGoalEdgeIds([])
        setStatusText(`Cycle detection (${strategyLabel}) ready. Press Play or step through manually.`)
        return
      }
      const boundedIndex = Math.min(index, result.steps.length - 1)
      const currentStep = result.steps[boundedIndex]
      const visitedIds = result.steps.slice(0, boundedIndex + 1).map((s) => s.nodeId)
      const findEdgeId = (fromId: string, toId: string) =>
        edges.find(
          (e) =>
            (e.fromNodeId === fromId && e.toNodeId === toId) ||
            (e.fromNodeId === toId && e.toNodeId === fromId),
        )?.id ?? null
      const visitedEdgeIds = new Set<string>()
      result.steps.slice(0, boundedIndex + 1).forEach((s) => {
        if (s.fromNodeId === null) return
        const edgeId = findEdgeId(s.fromNodeId, s.nodeId)
        if (edgeId) visitedEdgeIds.add(edgeId)
      })
      const currentEdgeId =
        currentStep.fromNodeId !== null
          ? findEdgeId(currentStep.fromNodeId, currentStep.nodeId)
          : null
      setTraversalCurrentNodeId(currentStep.nodeId)
      setTraversalCurrentEdgeId(currentEdgeId)
      setTraversalVisitedNodeIds(visitedIds)
      setTraversalVisitedEdgeIds([...visitedEdgeIds])
      setTraversalFrontierNodeIds(currentStep.frontierNodeIds)
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setStatusText(
        `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
      )
    },
    onResetVisualization: () => {
      setStatusText(IDLE_STATUS)
      clearExtras()
    },
    onClearStateOnly: clearExtras,
    onClearCompletion: clearExtras,
  })

  // Write finalize logic after pb is available; re-runs when nodes/edges change so status text stays fresh.
  const { finalizeRef } = pb
  useEffect(() => {
    finalizeRef.current = (result) => {
      // Build the set of directed edge IDs that form the detected cycle.
      const goalEdgeIds: string[] = []
      if (result.hasCycle && result.cycleNodeIds.length >= 2) {
        const isDirectedMatch = (edge: GraphEdge, fromId: string, toId: string) => {
          if (edge.fromNodeId === fromId && edge.toNodeId === toId)
            return edge.direction === 'forward' || edge.direction === 'both'
          if (edge.fromNodeId === toId && edge.toNodeId === fromId)
            return edge.direction === 'backward' || edge.direction === 'both'
          return false
        }
        const ids = new Set<string>()
        for (let i = 0; i < result.cycleNodeIds.length; i += 1) {
          const fromId = result.cycleNodeIds[i]
          const toId = result.cycleNodeIds[(i + 1) % result.cycleNodeIds.length]
          const edgeId = edges.find((edge) => isDirectedMatch(edge, fromId, toId))?.id
          if (edgeId) ids.add(edgeId)
        }
        goalEdgeIds.push(...ids)
      }
      setTraversalGoalNodeIds(result.hasCycle ? result.cycleNodeIds : [])
      setCycleGoalEdgeIds(goalEdgeIds)
      setStatusText(buildCycleDetectionCompletionStatus(result, nodes))
    }
  }, [finalizeRef, nodes, edges, setTraversalGoalNodeIds])

  // Validates the graph, runs cycle detection with the given strategy, and initialises the playback session.
  const runCycleDetectionFromSidebar = (strategy: TraversalStrategy) => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    onResetTraversal()
    setCycleGoalEdgeIds([])
    strategyRef.current = strategy

    if (isUndirectedMode) {
      setStatusText('Switch to Directed at the top left of the canvas to run cycle detection.')
      return
    }
    if (nodes.length === 0) {
      setStatusText('Add nodes to the canvas first.')
      return
    }

    const startNodeId = nodes.find((n) => n.label === startNodeLabel.trim())?.id
    const result = runCycleDetection(nodes, edges, strategy, startNodeId)
    if (result.steps.length === 0) {
      setStatusText('Cycle detection could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    pb.setResult(result)
    pb.startNewSession()
    pb.setIsRunning(true)
    setStatusText(`Cycle detection (${strategyLabel}) ready. Press Play or step through manually.`)
  }

  const canRunCycleDetection = nodes.length > 0 && !isUndirectedMode

  const cycleOutput: CycleOutput =
    pb.result !== null
      ? {
          hasCycle: pb.result.hasCycle,
          cycleNodeLabels: formatCycleNodeLabels(pb.result, nodes),
          operationCount: pb.result.operationCount,
        }
      : null

  return {
    cycleDetectionResult: pb.result,
    isCycleDetectionRunning: pb.isRunning,
    cycleDetectionStatusText: statusText,
    cycleDetectionCurrentExplanation: (() => {
      const stepExplanation = pb.result?.steps[pb.stepIndex]?.explanation ?? ''
      if (!pb.isPlaybackComplete || !pb.result) return stepExplanation
      const completionMessage = pb.result.hasCycle
        ? ` ✓ Cycle detected.`
        : ` ✓ No cycle found. Graph is acyclic.`
      return stepExplanation + completionMessage
    })(),
    cycleGoalEdgeIds,
    cycleDetectionStartNodeLabel: startNodeLabel,

    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    stepIndex: pb.stepIndex,
    canStepBackward: pb.canStepBackward,
    canStepForward: pb.canStepForward,
    canTogglePlay: pb.canTogglePlay,
    isPlaybackComplete: pb.isPlaybackComplete,

    cycleOutput,

    resetCycleDetectionVisualization: pb.resetVisualization,
    clearCycleDetectionAlgorithmStateOnly: pb.clearStateOnly,
    runCycleDetectionFromSidebar,
    handleAlgorithmModeChangeFromSidebar: pb.handleAlgorithmModeChange,
    handleCycleDetectionStartNodeLabelChange: setStartNodeLabel,
    stepCycleDetectionForward: pb.stepForward,
    stepCycleDetectionBackward: pb.stepBackward,
    playCycleDetection: pb.play,
    pauseCycleDetection: pb.pause,
    handleCycleDetectionPlaybackSpeedChange: pb.setPlaybackSpeed,
    canRunCycleDetection,
  }
}
