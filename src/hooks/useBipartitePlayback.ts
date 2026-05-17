import { useCallback, useEffect, useRef, useState } from 'react'

import type { GraphEdge, GraphNode } from '../types'

import type { BipartiteResult, TraversalStrategy } from '../algorithms/algorithmstypes'

import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'

import { runBipartiteCheck } from '../algorithms/bipartiteCheck'

import {
  buildBipartiteCompletionStatus,
  formatBipartiteGroupLabels,
} from '../algorithms/bipartiteUIHelpers'

import { useAlgorithmPlayback, type TraversalVisualSetters } from './useAlgorithmPlayback'

// Returns the uppercase strategy label used in status messages.
function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

const IDLE_STATUS = 'Select BFS or DFS, then run bipartite check (Undirected canvas).'

type UseBipartitePlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  isUndirectedMode: boolean
  traversalVisualSetters: TraversalVisualSetters
  onResetTraversal: () => void
}

export type BipartiteOutput = {
  isBipartite: boolean
  groupALabels: string | null
  groupBLabels: string | null
} | null

export type BipartitePlaybackHandle = {
  bipartiteResult: BipartiteResult | null
  isBipartiteRunning: boolean
  bipartiteStatusText: string
  bipartiteGroupANodeIds: string[]
  bipartiteGroupBNodeIds: string[]

  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  bipartiteOutput: BipartiteOutput

  resetBipartiteVisualization: () => void
  clearBipartiteAlgorithmStateOnly: () => void
  runBipartiteFromSidebar: (strategy: TraversalStrategy) => void
  handleAlgorithmModeChangeFromSidebar: (mode: AlgorithmMode) => void
  stepBipartiteForward: () => void
  stepBipartiteBackward: () => void
  playBipartite: () => void
  pauseBipartite: () => void
  handleBipartitePlaybackSpeedChange: (value: number) => void
  canRunBipartite: boolean
}

// Manages bipartite check algorithm state, playback controls, and canvas visual updates.
export function useBipartitePlayback({
  nodes,
  edges,
  isUndirectedMode,
  traversalVisualSetters,
  onResetTraversal,
}: UseBipartitePlaybackParams): BipartitePlaybackHandle {
  const {
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
  } = traversalVisualSetters

  const [statusText, setStatusText] = useState(IDLE_STATUS)
  const [bipartiteGroupANodeIds, setBipartiteGroupANodeIds] = useState<string[]>([])
  const [bipartiteGroupBNodeIds, setBipartiteGroupBNodeIds] = useState<string[]>([])
  const strategyRef = useRef<TraversalStrategy>('bfs')

  // Clears bipartite-specific state shared by both reset paths.
  const clearExtras = useCallback(() => {
    setBipartiteGroupANodeIds([])
    setBipartiteGroupBNodeIds([])
  }, [])

  const pb = useAlgorithmPlayback<BipartiteResult>({
    modeKey: 'bipartite',
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
        setBipartiteGroupANodeIds([])
        setBipartiteGroupBNodeIds([])
        setStatusText(`Bipartite check (${strategyLabel}) ready. Press Play or step through manually.`)
        return
      }

      const boundedIndex = Math.min(index, result.steps.length - 1)
      const currentStep = result.steps[boundedIndex]
      const visitedSteps = result.steps.slice(0, boundedIndex + 1)

      const groupA: string[] = []
      const groupB: string[] = []
      visitedSteps.forEach((s) => {
        if (s.color === 0) groupA.push(s.nodeId)
        else groupB.push(s.nodeId)
      })

      const visitedIds = visitedSteps.map((s) => s.nodeId)
      const findEdgeId = (fromId: string, toId: string) =>
        edges.find(
          (e) =>
            (e.fromNodeId === fromId && e.toNodeId === toId) ||
            (e.fromNodeId === toId && e.toNodeId === fromId),
        )?.id ?? null

      const visitedEdgeIds = new Set<string>()
      visitedSteps.forEach((s) => {
        if (s.fromNodeId === null) return
        const edgeId = findEdgeId(s.fromNodeId, s.nodeId)
        if (edgeId) visitedEdgeIds.add(edgeId)
      })

      const currentEdgeId =
        currentStep.fromNodeId !== null ? findEdgeId(currentStep.fromNodeId, currentStep.nodeId) : null

      setTraversalCurrentNodeId(currentStep.nodeId)
      setTraversalCurrentEdgeId(currentEdgeId)
      setTraversalVisitedNodeIds(visitedIds)
      setTraversalVisitedEdgeIds([...visitedEdgeIds])
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setBipartiteGroupANodeIds(groupA)
      setBipartiteGroupBNodeIds(groupB)
      setStatusText(
        `Coloring ${currentStep.nodeLabel} → Group ${currentStep.color === 0 ? 'A' : 'B'} (step ${currentStep.order}/${result.steps.length}) · ${strategyLabel}`,
      )
    },
    onResetVisualization: () => {
      setStatusText(IDLE_STATUS)
      clearExtras()
    },
    onClearStateOnly: clearExtras,
  })

  // Writes finalize logic after pb is available.
  const { finalizeRef } = pb
  useEffect(() => {
    finalizeRef.current = (result) => {
      setStatusText(buildBipartiteCompletionStatus(result, nodes))
    }
  }, [finalizeRef, nodes])

  // Validates the graph, runs bipartite check with the given strategy, and initialises the playback session.
  const runBipartiteFromSidebar = (strategy: TraversalStrategy) => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    onResetTraversal()
    strategyRef.current = strategy

    if (!isUndirectedMode) {
      setStatusText('Switch to Undirected at the top left of the canvas to run bipartite check.')
      return
    }
    if (nodes.length === 0) {
      setStatusText('Add nodes to the canvas first.')
      return
    }

    const result = runBipartiteCheck(nodes, edges, strategy)
    if (result.steps.length === 0) {
      setStatusText('Bipartite check could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    pb.setResult(result)
    pb.startNewSession()
    pb.setIsRunning(true)
    setStatusText(`Bipartite check (${strategyLabel}) ready. Press Play or step through manually.`)
  }

  const canRunBipartite = nodes.length > 0 && isUndirectedMode

  const bipartiteOutput: BipartiteOutput =
    pb.result !== null
      ? {
          isBipartite: pb.result.isBipartite,
          groupALabels: formatBipartiteGroupLabels(pb.result.groupANodeIds, nodes),
          groupBLabels: formatBipartiteGroupLabels(pb.result.groupBNodeIds, nodes),
        }
      : null

  return {
    bipartiteResult: pb.result,
    isBipartiteRunning: pb.isRunning,
    bipartiteStatusText: statusText,
    bipartiteGroupANodeIds,
    bipartiteGroupBNodeIds,

    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    stepIndex: pb.stepIndex,
    canStepBackward: pb.canStepBackward,
    canStepForward: pb.canStepForward,
    canTogglePlay: pb.canTogglePlay,
    isPlaybackComplete: pb.isPlaybackComplete,

    bipartiteOutput,

    resetBipartiteVisualization: pb.resetVisualization,
    clearBipartiteAlgorithmStateOnly: pb.clearStateOnly,
    runBipartiteFromSidebar,
    handleAlgorithmModeChangeFromSidebar: pb.handleAlgorithmModeChange,
    stepBipartiteForward: pb.stepForward,
    stepBipartiteBackward: pb.stepBackward,
    playBipartite: pb.play,
    pauseBipartite: pb.pause,
    handleBipartitePlaybackSpeedChange: pb.setPlaybackSpeed,
    canRunBipartite,
  }
}
