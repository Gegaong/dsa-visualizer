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
import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
} from '../utils/constants'
import { buildWeakCCOutlineHSLByNodeId } from '../utils/weakCCOutlineHues'
import { runConnectedComponents } from '../algorithms/connectedComponents'
import {
  buildConnectedComponentsCompletionStatus,
  formatWeakCCGroupsDisplay,
} from '../algorithms/connectedComponentsUIHelpers'
import { useStepPlayback } from './useStepPlayback'

function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

type TraversalVisualSetters = {
  setTraversalVisitedNodeIds: (ids: string[]) => void
  setTraversalVisitedEdgeIds: (ids: string[]) => void
  setTraversalCurrentNodeId: (id: string | null) => void
  setTraversalCurrentEdgeId: (id: string | null) => void
  setTraversalStartNodeId: (id: string | null) => void
  setTraversalGoalNodeIds: (ids: string[]) => void
}

type UseConnectedComponentsPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  /** Connected components run only in undirected canvas mode. */
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

export function useConnectedComponentsPlayback({
  nodes,
  edges,
  isUndirectedMode,
  traversalVisualSetters,
  onResetTraversal,
}: UseConnectedComponentsPlaybackParams): ConnectedComponentsPlaybackHandle {
  const {
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  } = traversalVisualSetters

  const [connectedComponentsResult, setConnectedComponentsResult] =
    useState<ConnectedComponentsResult | null>(null)
  const connectedComponentsResultRef = useRef<ConnectedComponentsResult | null>(null)
  const connectedComponentsStrategyRef = useRef<TraversalStrategy>('bfs')
  const sidebarAlgorithmModeRef = useRef<AlgorithmMode>('components')
  const finalizeConnectedComponentsRunRef = useRef<(r: ConnectedComponentsResult) => void>(() => {})
  const connectedComponentsPlaybackStopRef = useRef(() => {})
  const [connectedComponentsPlaybackSession, setConnectedComponentsPlaybackSession] = useState(0)
  const [isConnectedComponentsRunning, setIsConnectedComponentsRunning] = useState(false)
  const [connectedComponentsStatusText, setConnectedComponentsStatusText] = useState(
    'Select BFS or DFS, then run connected components (Undirected canvas).',
  )
  const [weakCCOutlineHslByNodeId, setWeakCCOutlineHslByNodeId] = useState<Map<
    string,
    WeakCCOutlineHSL
  > | null>(null)
  const [weakCCVisitedNodeIds, setWeakCCVisitedNodeIds] = useState<string[]>([])
  const [weakCCVisitedEdgeIds, setWeakCCVisitedEdgeIds] = useState<string[]>([])

  useEffect(() => {
    connectedComponentsResultRef.current = connectedComponentsResult
  }, [connectedComponentsResult])

  const applyConnectedComponentsStepIndex = (result: ConnectedComponentsResult, index: number) => {
    const strategyLabel = bfsDfsLabel(connectedComponentsStrategyRef.current)
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalVisitedEdgeIds([])
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setWeakCCVisitedNodeIds([])
      setWeakCCVisitedEdgeIds([])
      setConnectedComponentsStatusText(
        `Connected components (${strategyLabel}) ready. Press Play or step through manually.`,
      )
      return
    }

    const boundedIndex = Math.min(index, result.steps.length - 1)
    const currentStep = result.steps[boundedIndex]
    const visitedIds = result.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)
    const findEdgeId = (fromId: string, toId: string) =>
      edges.find(
        (edge) =>
          (edge.fromNodeId === fromId && edge.toNodeId === toId) ||
          (edge.fromNodeId === toId && edge.toNodeId === fromId),
      )?.id ?? null
    const visitedEdgeIds = new Set<string>()
    result.steps.slice(0, boundedIndex + 1).forEach((step) => {
      if (step.fromNodeId === null) return
      const edgeId = findEdgeId(step.fromNodeId, step.nodeId)
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
    setConnectedComponentsStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
    )
  }

  const connectedComponentsPlayback = useStepPlayback({
    stepCount: connectedComponentsResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: connectedComponentsPlaybackSession,
    onStepIndexChange: (index) => {
      const r = connectedComponentsResultRef.current
      if (!r) return
      applyConnectedComponentsStepIndex(r, index)
    },
    onComplete: () => {
      const r = connectedComponentsResultRef.current
      if (r) finalizeConnectedComponentsRunRef.current(r)
    },
  })

  const weakCCOutlineActive =
    connectedComponentsResult !== null && connectedComponentsPlayback.stepIndex >= 0

  useEffect(() => {
    finalizeConnectedComponentsRunRef.current = (result: ConnectedComponentsResult) => {
      connectedComponentsPlayback.stopPlayback()
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setConnectedComponentsStatusText(buildConnectedComponentsCompletionStatus(result, nodes))
    }
  }, [connectedComponentsPlayback, nodes, setTraversalCurrentNodeId, setTraversalCurrentEdgeId, setTraversalStartNodeId, setTraversalGoalNodeIds])

  useEffect(() => {
    connectedComponentsPlaybackStopRef.current = () => connectedComponentsPlayback.stopPlayback()
  }, [connectedComponentsPlayback])

  const clearConnectedComponentsPlaybackAndResult = useCallback(() => {
    connectedComponentsPlaybackStopRef.current()
    setConnectedComponentsResult(null)
    setConnectedComponentsPlaybackSession((s) => s + 1)
  }, [])

  const resetConnectedComponentsVisualization = useCallback(() => {
    clearConnectedComponentsPlaybackAndResult()
    setTraversalVisitedNodeIds([])
    setTraversalVisitedEdgeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalCurrentEdgeId(null)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setConnectedComponentsStatusText('Select BFS or DFS, then run connected components (Undirected canvas).')
    setIsConnectedComponentsRunning(false)
    setWeakCCOutlineHslByNodeId(null)
    setWeakCCVisitedNodeIds([])
    setWeakCCVisitedEdgeIds([])
  }, [
    clearConnectedComponentsPlaybackAndResult,
    setTraversalVisitedNodeIds,
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  ])

  const clearConnectedComponentsAlgorithmStateOnly = useCallback(() => {
    clearConnectedComponentsPlaybackAndResult()
    setIsConnectedComponentsRunning(false)
    setWeakCCOutlineHslByNodeId(null)
    setWeakCCVisitedNodeIds([])
    setWeakCCVisitedEdgeIds([])
  }, [clearConnectedComponentsPlaybackAndResult])

  const handleAlgorithmModeChangeFromSidebar = useCallback(
    (mode: AlgorithmMode) => {
      const prev = sidebarAlgorithmModeRef.current
      sidebarAlgorithmModeRef.current = mode
      if (prev === mode) return
      if (prev === 'components' && mode !== 'components') {
        resetConnectedComponentsVisualization()
      }
    },
    [resetConnectedComponentsVisualization],
  )

  const runConnectedComponentsFromSidebar = (strategy: TraversalStrategy) => {
    if (connectedComponentsPlayback.isPlaying) return
    connectedComponentsPlaybackStopRef.current()
    onResetTraversal()

    connectedComponentsStrategyRef.current = strategy

    if (!isUndirectedMode) {
      setConnectedComponentsStatusText(
        'Switch to Undirected at the top left of the canvas to run connected components.',
      )
      return
    }

    if (nodes.length === 0) {
      setConnectedComponentsStatusText('Add nodes to the canvas first.')
      return
    }

    const result = runConnectedComponents(nodes, edges, strategy)
    if (result.steps.length === 0) {
      setConnectedComponentsStatusText('Connected components could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    setConnectedComponentsResult(result)
    setWeakCCOutlineHslByNodeId(buildWeakCCOutlineHSLByNodeId(result.components))
    setConnectedComponentsPlaybackSession((s) => s + 1)
    setIsConnectedComponentsRunning(true)
    setConnectedComponentsStatusText(
      `Connected components (${strategyLabel}) ready. Press Play or step through manually.`,
    )
  }

  const stepConnectedComponentsForward = () => {
    if (!connectedComponentsResult) return
    connectedComponentsPlayback.stepForward()
  }

  const stepConnectedComponentsBackward = () => {
    if (!connectedComponentsResult) return
    connectedComponentsPlayback.stepBackward()
    setIsConnectedComponentsRunning(true)
    setTraversalGoalNodeIds([])
  }

  const playConnectedComponents = () => {
    if (!connectedComponentsResult) return
    const replayFromEnd =
      connectedComponentsPlayback.stepIndex >= connectedComponentsResult.steps.length - 1
    connectedComponentsPlayback.togglePlay()
    if (replayFromEnd) {
      setTraversalGoalNodeIds([])
      setIsConnectedComponentsRunning(true)
    }
  }

  const pauseConnectedComponents = () => {
    connectedComponentsPlayback.stopPlayback()
  }

  const handleConnectedComponentsPlaybackSpeedChange = (value: number) => {
    connectedComponentsPlayback.setPlaybackSpeed(value)
  }

  const canRunConnectedComponents = nodes.length > 0 && isUndirectedMode

  const ccOutput: CCOutput =
    connectedComponentsResult !== null
      ? {
          componentCount: connectedComponentsResult.componentCount,
          largestSize: connectedComponentsResult.largestComponentSize,
          groupsText: formatWeakCCGroupsDisplay(connectedComponentsResult, nodes),
        }
      : null

  return {
    connectedComponentsResult,
    isConnectedComponentsRunning,
    connectedComponentsStatusText,
    weakCCOutlineHslByNodeId,
    weakCCOutlineActive,
    weakCCVisitedNodeIds,
    weakCCVisitedEdgeIds,

    isPlaying: connectedComponentsPlayback.isPlaying,
    playbackSpeed: connectedComponentsPlayback.playbackSpeed,
    stepIndex: connectedComponentsPlayback.stepIndex,
    canStepBackward: connectedComponentsResult !== null && connectedComponentsPlayback.canStepBackward,
    canStepForward: connectedComponentsResult !== null && connectedComponentsPlayback.canStepForward,
    canTogglePlay: connectedComponentsResult !== null && connectedComponentsPlayback.canTogglePlay,
    isPlaybackComplete:
      connectedComponentsResult !== null && connectedComponentsPlayback.isPlaybackComplete,

    ccOutput,

    resetConnectedComponentsVisualization,
    clearConnectedComponentsAlgorithmStateOnly,
    runConnectedComponentsFromSidebar,
    handleAlgorithmModeChangeFromSidebar,
    stepConnectedComponentsForward,
    stepConnectedComponentsBackward,
    playConnectedComponents,
    pauseConnectedComponents,
    handleConnectedComponentsPlaybackSpeedChange,
    canRunConnectedComponents,
  }
}
