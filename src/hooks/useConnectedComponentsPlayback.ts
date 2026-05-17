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
  ConnectedComponentsResult,
  TraversalStrategy,
} from '../algorithms/algorithmstypes'

import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'

import type { WeakCCOutlineHSL } from '../utils/weakCCOutlineHues'

import { buildWeakCCOutlineHSLByNodeId } from '../utils/weakCCOutlineHues'

import { runConnectedComponents } from '../algorithms/connectedComponents'

import {
  buildConnectedComponentsCompletionStatus,
  formatWeakCCGroupsDisplay,
} from '../algorithms/connectedComponentsUIHelpers'

import {
  useAlgorithmPlayback,
  type TraversalVisualSetters,
} from './useAlgorithmPlayback'

// Returns the uppercase strategy label used in status messages.
function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

const IDLE_STATUS = 'Select BFS or DFS, then run connected components (Undirected canvas).'

type UseConnectedComponentsPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isUndirectedMode: boolean
  traversalVisualSetters: TraversalVisualSetters
  onResetTraversal: () => void
}

export type CCOutput = {
  componentCount: number
  largestSize: number
  groupsText: string
} | null

export type ConnectedComponentsPlaybackHandle = {
  connectedComponentsResult: ConnectedComponentsResult | null
  isConnectedComponentsRunning: boolean
  connectedComponentsStatusText: string
  weakCCOutlineHslByNodeId: Map<string, WeakCCOutlineHSL> | null
  weakCCOutlineActive: boolean
  weakCCVisitedNodeIds: string[]
  weakCCVisitedEdgeIds: string[]

  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  ccOutput: CCOutput

  resetConnectedComponentsVisualization: () => void
  clearConnectedComponentsAlgorithmStateOnly: () => void
  runConnectedComponentsFromSidebar: (strategy: TraversalStrategy) => void
  handleAlgorithmModeChangeFromSidebar: (mode: AlgorithmMode) => void
  stepConnectedComponentsForward: () => void
  stepConnectedComponentsBackward: () => void
  playConnectedComponents: () => void
  pauseConnectedComponents: () => void
  handleConnectedComponentsPlaybackSpeedChange: (value: number) => void
  canRunConnectedComponents: boolean
}

// Manages connected components algorithm state, playback controls, and canvas visual updates.
export function useConnectedComponentsPlayback({
  nodes,
  edges,
  isUndirectedMode,
  traversalVisualSetters,
  onResetTraversal,
}: UseConnectedComponentsPlaybackParams): ConnectedComponentsPlaybackHandle {
  const {
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  } = traversalVisualSetters

  const [statusText, setStatusText] = useState(IDLE_STATUS)
  const [weakCCOutlineHslByNodeId, setWeakCCOutlineHslByNodeId] = useState<Map<
    string,
    WeakCCOutlineHSL
  > | null>(null)
  const [weakCCVisitedNodeIds, setWeakCCVisitedNodeIds] = useState<string[]>([])
  const [weakCCVisitedEdgeIds, setWeakCCVisitedEdgeIds] = useState<string[]>([])
  const strategyRef = useRef<TraversalStrategy>('bfs')

  // Clears the algorithm-specific extra state shared by both reset paths.
  const clearExtras = useCallback(() => {
    setWeakCCOutlineHslByNodeId(null)
    setWeakCCVisitedNodeIds([])
    setWeakCCVisitedEdgeIds([])
  }, [])

  const pb = useAlgorithmPlayback<ConnectedComponentsResult>({
    modeKey: 'components',
    traversalVisualSetters,
    onApplyStep: (result, index) => {
      const strategyLabel = bfsDfsLabel(strategyRef.current)
      if (index < 0) {
        setTraversalCurrentNodeId(null)
        setTraversalCurrentEdgeId(null)
        setTraversalVisitedNodeIds([])
        setTraversalVisitedEdgeIds([])
        setTraversalStartNodeId(null)
        setTraversalGoalNodeIds([])
        setWeakCCVisitedNodeIds([])
        setWeakCCVisitedEdgeIds([])
        setStatusText(`Connected components (${strategyLabel}) ready. Press Play or step through manually.`)
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
      setWeakCCVisitedNodeIds(visitedIds)
      setWeakCCVisitedEdgeIds([...visitedEdgeIds])
      setTraversalStartNodeId(currentStep.componentRootNodeId)
      setStatusText(
        `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
      )
    },
    onResetVisualization: () => {
      setStatusText(IDLE_STATUS)
      clearExtras()
    },
    onClearStateOnly: clearExtras,
  })

  // Write finalize logic after pb is available so it can use pb.setIsRunning etc. if needed.
  const { finalizeRef } = pb
  useEffect(() => {
    finalizeRef.current = (result) => {
      setTraversalGoalNodeIds([])
      setStatusText(buildConnectedComponentsCompletionStatus(result, nodes))
    }
  }, [finalizeRef, nodes, setTraversalGoalNodeIds])

  // Validates the graph, runs connected components with the given strategy, and initialises the playback session.
  const runConnectedComponentsFromSidebar = (strategy: TraversalStrategy) => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    onResetTraversal()
    strategyRef.current = strategy

    if (!isUndirectedMode) {
      setStatusText('Switch to Undirected at the top left of the canvas to run connected components.')
      return
    }
    if (nodes.length === 0) {
      setStatusText('Add nodes to the canvas first.')
      return
    }

    const result = runConnectedComponents(nodes, edges, strategy)
    if (result.steps.length === 0) {
      setStatusText('Connected components could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    setWeakCCOutlineHslByNodeId(buildWeakCCOutlineHSLByNodeId(result.components))
    pb.setResult(result)
    pb.startNewSession()
    pb.setIsRunning(true)
    setStatusText(`Connected components (${strategyLabel}) ready. Press Play or step through manually.`)
  }

  const weakCCOutlineActive = pb.result !== null && pb.stepIndex >= 0

  const canRunConnectedComponents = nodes.length > 0 && isUndirectedMode

  const ccOutput: CCOutput =
    pb.result !== null
      ? {
          componentCount: pb.result.componentCount,
          largestSize: pb.result.largestComponentSize,
          groupsText: formatWeakCCGroupsDisplay(pb.result, nodes),
        }
      : null

  return {
    connectedComponentsResult: pb.result,
    isConnectedComponentsRunning: pb.isRunning,
    connectedComponentsStatusText: statusText,
    weakCCOutlineHslByNodeId,
    weakCCOutlineActive,
    weakCCVisitedNodeIds,
    weakCCVisitedEdgeIds,

    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    stepIndex: pb.stepIndex,
    canStepBackward: pb.canStepBackward,
    canStepForward: pb.canStepForward,
    canTogglePlay: pb.canTogglePlay,
    isPlaybackComplete: pb.isPlaybackComplete,

    ccOutput,

    resetConnectedComponentsVisualization: pb.resetVisualization,
    clearConnectedComponentsAlgorithmStateOnly: pb.clearStateOnly,
    runConnectedComponentsFromSidebar,
    handleAlgorithmModeChangeFromSidebar: pb.handleAlgorithmModeChange,
    stepConnectedComponentsForward: pb.stepForward,
    stepConnectedComponentsBackward: pb.stepBackward,
    playConnectedComponents: pb.play,
    pauseConnectedComponents: pb.pause,
    handleConnectedComponentsPlaybackSpeedChange: pb.setPlaybackSpeed,
    canRunConnectedComponents,
  }
}
