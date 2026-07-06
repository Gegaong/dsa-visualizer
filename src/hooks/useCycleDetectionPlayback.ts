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
} from '../algorithms/algorithmTypes'

import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'

import { runCycleDetection } from '../algorithms/cycleDetection'

import { buildNeighborsMap } from '../algorithms/graphAdjacency'

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

export type CyclePhase = 'ready' | 'step-explore' | 'step-cycle' | 'done-found' | 'done-empty'

export type CycleDetectionPlaybackHandle = {
  cycleDetectionResult: CycleDetectionResult | null
  isCycleDetectionRunning: boolean
  cycleDetectionStatusText: string
  cycleCurrentPhase: CyclePhase | null
  cycleVarsRows: string[][] | null
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
  const [currentStrategy, setCurrentStrategy] = useState<TraversalStrategy>('bfs')
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
    setCurrentStrategy(strategy)

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
    cycleCurrentPhase: (() => {
      if (!pb.isRunning || !pb.result) return null as CyclePhase | null
      if (pb.stepIndex < 0) return 'ready' as CyclePhase
      const si = Math.min(pb.stepIndex, pb.result.steps.length - 1)
      if (pb.isPlaybackComplete) {
        return pb.result.hasCycle ? 'done-found' as CyclePhase : 'done-empty' as CyclePhase
      }
      if (currentStrategy === 'dfs' && pb.result.hasCycle && si === pb.result.steps.length - 1) {
        return 'step-cycle' as CyclePhase
      }
      if (currentStrategy === 'bfs' && pb.result.hasCycle) {
        if (si >= pb.result.steps.length - pb.result.cycleNodeIds.length) {
          return 'step-cycle' as CyclePhase
        }
      }
      return 'step-explore' as CyclePhase
    })(),
    cycleVarsRows: (() => {
      if (!pb.isRunning || !pb.result) return null
      if (pb.stepIndex < 0) {
        if (currentStrategy === 'bfs') {
          const outNeighbors = buildNeighborsMap(nodes, edges)
          const inDegreeMap = new Map<string, number>(nodes.map(n => [n.id, 0]))
          nodes.forEach(n => outNeighbors.get(n.id)?.forEach(nbId => {
            inDegreeMap.set(nbId, (inDegreeMap.get(nbId) ?? 0) + 1)
          }))
          const zeroLabels = nodes.filter(n => (inDegreeMap.get(n.id) ?? 0) === 0).map(n => n.label)
          const inDegreeEntries = nodes.map(n => `${n.label}: ${inDegreeMap.get(n.id) ?? 0}`)
          return [
            [`u = —`, `removed = 0`],
            [`queue = [${zeroLabels.join(', ')}]`],
            [`inDegree = {${inDegreeEntries.join(', ')}}`],
          ]
        }
        return [[`v = —`, `u = —`, `nb = —`], [`inStack = {}`], [`visited = []`]]
      }
      const si = Math.min(pb.stepIndex, pb.result.steps.length - 1)
      const step = pb.result.steps[si]
      const isDone = pb.isPlaybackComplete
      if (currentStrategy === 'bfs') {
        // Reconstruction steps appended at end (cycle path) don't represent real Kahn's removals.
        const regularStepCount = pb.result.hasCycle
          ? pb.result.steps.length - pb.result.cycleNodeIds.length
          : pb.result.steps.length
        const appliedSteps = Math.min(si + 1, regularStepCount)
        const nodeById = isDone ? null : new Map(nodes.map(n => [n.id, n]))
        const frontier = isDone ? [] : step.frontierNodeIds.map(id => nodeById?.get(id)?.label ?? id)
        const removed = appliedSteps
        const outNeighbors = buildNeighborsMap(nodes, edges)
        const inDegreeMap = new Map<string, number>(nodes.map(n => [n.id, 0]))
        nodes.forEach(n => outNeighbors.get(n.id)?.forEach(nbId => {
          inDegreeMap.set(nbId, (inDegreeMap.get(nbId) ?? 0) + 1)
        }))
        for (let i = 0; i < appliedSteps; i++) {
          outNeighbors.get(pb.result.steps[i].nodeId)?.forEach(nbId => {
            inDegreeMap.set(nbId, Math.max(0, (inDegreeMap.get(nbId) ?? 0) - 1))
          })
        }
        const removedIds = new Set(pb.result.steps.slice(0, appliedSteps).map(s => s.nodeId))
        const inDegreeEntries = nodes
          .filter(n => !removedIds.has(n.id))
          .map(n => `${n.label}: ${inDegreeMap.get(n.id) ?? 0}`)
        return [
          [`u = ${isDone ? '—' : step.nodeLabel}`, `removed = ${removed}`],
          [`queue = [${frontier.join(', ')}]`],
          [`inDegree = {${inDegreeEntries.join(', ')}}`],
        ]
      }
      const inStackLabels: string[] = []
      if (!isDone) {
        inStackLabels.push(step.nodeLabel)
        let fromId: string | null = step.fromNodeId
        let searchBefore = si
        while (fromId !== null) {
          let found = -1
          for (let i = searchBefore - 1; i >= 0; i--) {
            if (pb.result.steps[i].nodeId === fromId) { found = i; break }
          }
          if (found === -1) break
          inStackLabels.unshift(pb.result.steps[found].nodeLabel)
          fromId = pb.result.steps[found].fromNodeId
          searchBefore = found
        }
      }
      const visitedLabels = pb.result.steps.slice(0, si + 1).map(s => s.nodeLabel)
      const vLabel = isDone ? '—' : inStackLabels[0]
      const uLabel = isDone ? '—' : step.fromNodeId === null ? step.nodeLabel : (nodes.find(n => n.id === step.fromNodeId)?.label ?? '?')
      const nbLabel = isDone ? '—' : step.fromNodeId === null ? '—' : step.nodeLabel
      return [
        [`v = ${vLabel}`, `u = ${uLabel}`, `nb = ${nbLabel}`],
        [`inStack = {${inStackLabels.join(', ')}}`],
        [`visited = [${visitedLabels.join(', ')}]`],
      ]
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
    handleCycleDetectionStartNodeLabelChange: (value: string) => setStartNodeLabel(value.toUpperCase()),
    stepCycleDetectionForward: pb.stepForward,
    stepCycleDetectionBackward: pb.stepBackward,
    playCycleDetection: pb.play,
    pauseCycleDetection: pb.pause,
    handleCycleDetectionPlaybackSpeedChange: pb.setPlaybackSpeed,
    canRunCycleDetection,
  }
}
