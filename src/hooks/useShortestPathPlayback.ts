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
  ShortestPathResult,
  TraversalStrategy,
} from '../algorithms/algorithmstypes'

import type { AlgorithmMode } from '../components/sidebar/sidebarTypes'

import { runShortestPath } from '../algorithms/shortestPath'

import {
  buildShortestPathCompletionStatus,
  formatShortestPathNodeLabels,
} from '../algorithms/shortestPathUIHelpers'

import {
  useAlgorithmPlayback,
  type TraversalVisualSetters,
} from './useAlgorithmPlayback'

// Returns the uppercase strategy label used in status messages.
function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

const IDLE_STATUS = 'Enter start and goal node labels, then run shortest path.'

type UseShortestPathPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  traversalVisualSetters: TraversalVisualSetters
  onResetTraversal: () => void
}

export type ShortestPathOutput = {
  pathFound: boolean
  pathLength: number
  pathNodeLabels: string[]
  operationCount: number
} | null

export type SPPhase = 'ready' | 'step-explore' | 'step-goal' | 'done-found' | 'done-empty'

export type ShortestPathPlaybackHandle = {
  shortestPathResult: ShortestPathResult | null
  isShortestPathRunning: boolean
  // Status text ready for display; includes field-missing warnings before any run.
  shortestPathStatusText: string
  spCurrentPhase: SPPhase | null
  spVarsRows: string[][] | null
  startNodeLabel: string
  goalNodeLabel: string
  // Intermediate nodes on the found path (excludes start and goal).
  shortestPathNodeIds: string[]
  // Edges that form the found path, highlighted blue at completion.
  shortestPathEdgeIds: string[]

  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  shortestPathOutput: ShortestPathOutput

  resetShortestPathVisualization: () => void
  clearShortestPathAlgorithmStateOnly: () => void
  runShortestPathFromSidebar: (strategy: TraversalStrategy) => void
  handleAlgorithmModeChangeFromSidebar: (mode: AlgorithmMode) => void
  handleStartNodeLabelChange: (value: string) => void
  handleGoalNodeLabelChange: (value: string) => void
  stepShortestPathForward: () => void
  stepShortestPathBackward: () => void
  playShortestPath: () => void
  pauseShortestPath: () => void
  handleShortestPathPlaybackSpeedChange: (value: number) => void
  canRunShortestPath: boolean
  dfsBestPathLength: number | null
}

// Manages shortest path algorithm state, playback controls, and canvas visual updates.
export function useShortestPathPlayback({
  nodes,
  edges,
  traversalVisualSetters,
  onResetTraversal,
}: UseShortestPathPlaybackParams): ShortestPathPlaybackHandle {
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
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [shortestPathNodeIds, setShortestPathNodeIds] = useState<string[]>([])
  const [shortestPathEdgeIds, setShortestPathEdgeIds] = useState<string[]>([])
  const [currentStrategy, setCurrentStrategy] = useState<TraversalStrategy>('bfs')
  const strategyRef = useRef<TraversalStrategy>('bfs')

  // Clears the algorithm-specific extra state shared by all reset paths.
  const clearExtras = useCallback(() => {
    setShortestPathNodeIds([])
    setShortestPathEdgeIds([])
  }, [])

  const pb = useAlgorithmPlayback<ShortestPathResult>({
    modeKey: 'shortest-path',
    traversalVisualSetters,
    onApplyStep: (result, index) => {
      const strategyLabel = bfsDfsLabel(strategyRef.current)
      if (index < 0) {
        setTraversalCurrentNodeId(null)
        setTraversalCurrentEdgeId(null)
        setTraversalVisitedNodeIds([])
        setTraversalVisitedEdgeIds([])
        setTraversalFrontierNodeIds([])
        setTraversalStartNodeId(result.startNodeId)
        setTraversalGoalNodeIds([result.goalNodeId])
        setShortestPathNodeIds([])
        setShortestPathEdgeIds([])
        setStatusText(`Shortest path (${strategyLabel}) ready. Press Play or step through manually.`)
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
      setTraversalStartNodeId(result.startNodeId)
      setTraversalGoalNodeIds([result.goalNodeId])
      setShortestPathNodeIds([])
      setShortestPathEdgeIds([])
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

  // Write finalize logic after pb is available; re-runs when nodes/edges change so path edges stay fresh.
  const { finalizeRef } = pb
  useEffect(() => {
    finalizeRef.current = (result) => {
      const isDirectedMatch = (edge: GraphEdge, fromId: string, toId: string) => {
        if (edge.fromNodeId === fromId && edge.toNodeId === toId)
          return edge.direction === 'forward' || edge.direction === 'both'
        if (edge.fromNodeId === toId && edge.toNodeId === fromId)
          return edge.direction === 'backward' || edge.direction === 'both'
        return false
      }
      const pathEdgeIds: string[] = []
      for (let i = 0; i < result.pathNodeIds.length - 1; i += 1) {
        const fromId = result.pathNodeIds[i]
        const toId = result.pathNodeIds[i + 1]
        const edgeId = edges.find((e) => isDirectedMatch(e, fromId, toId))?.id
        if (edgeId) pathEdgeIds.push(edgeId)
      }
      // Goal keeps its traversal-goal style; start + intermediates get is-shortest-path (same blue).
      setTraversalGoalNodeIds([result.goalNodeId])
      setShortestPathNodeIds(result.pathFound ? result.pathNodeIds.slice(0, -1) : [])
      if (result.pathFound) setTraversalStartNodeId(null)
      setShortestPathEdgeIds(pathEdgeIds)
      setStatusText(buildShortestPathCompletionStatus(result, nodes))
    }
  }, [finalizeRef, nodes, edges, setTraversalGoalNodeIds, setTraversalStartNodeId])

  // Validates inputs, runs the algorithm, and initialises the playback session.
  const runShortestPathFromSidebar = (strategy: TraversalStrategy) => {
    if (pb.isPlaying) return
    pb.stopPlayback()
    onResetTraversal()
    strategyRef.current = strategy
    setCurrentStrategy(strategy)

    if (nodes.length === 0) {
      setStatusText('Add nodes to the canvas first.')
      return
    }
    const startNode = nodes.find((n) => n.label === startNodeLabel)
    const goalNode = nodes.find((n) => n.label === goalNodeLabel)
    if (!startNode) {
      setStatusText(`Node "${startNodeLabel}" not found on the canvas.`)
      return
    }
    if (!goalNode) {
      setStatusText(`Node "${goalNodeLabel}" not found on the canvas.`)
      return
    }

    const result = runShortestPath(nodes, edges, startNode.id, goalNode.id, strategy)
    if (result.steps.length === 0) {
      setStatusText('Shortest path could not run on this graph.')
      return
    }

    const strategyLabel = bfsDfsLabel(strategy)
    pb.setResult(result)
    pb.startNewSession()
    pb.setIsRunning(true)
    setStatusText(`Shortest path (${strategyLabel}) ready. Press Play or step through manually.`)
  }

  // Updates the start node label from the sidebar input.
  const handleStartNodeLabelChange = useCallback((value: string) => {
    setStartNodeLabel(value.toUpperCase())
  }, [])

  // Updates the goal node label from the sidebar input.
  const handleGoalNodeLabelChange = useCallback((value: string) => {
    setGoalNodeLabel(value.toUpperCase())
  }, [])

  const startMissing = startNodeLabel.trim() === ''
  const goalMissing = goalNodeLabel.trim() === ''
  const canRunShortestPath = nodes.length > 0 && !startMissing && !goalMissing

  // Mirrors the traversal warning pattern: surface missing-field messages in the status hint.
  let shortestPathStatusText = statusText
  if (startMissing && goalMissing) {
    shortestPathStatusText = 'Warning: Start node and Goal node are required fields.'
  } else if (startMissing) {
    shortestPathStatusText = 'Warning: Start node is a required field.'
  } else if (goalMissing) {
    shortestPathStatusText = 'Warning: Goal node is a required field.'
  }

  const shortestPathOutput: ShortestPathOutput =
    pb.result !== null
      ? {
          pathFound: pb.result.pathFound,
          pathLength: pb.result.pathNodeIds.length > 0 ? pb.result.pathNodeIds.length - 1 : 0,
          pathNodeLabels: formatShortestPathNodeLabels(pb.result, nodes),
          operationCount: pb.result.operationCount,
        }
      : null

  return {
    shortestPathResult: pb.result,
    isShortestPathRunning: pb.isRunning,
    shortestPathStatusText,
    spCurrentPhase: (() => {
      if (!pb.isRunning) return null as SPPhase | null
      if (pb.stepIndex < 0) return 'ready' as SPPhase
      const currentStep = pb.result?.steps[pb.stepIndex]
      const isGoalStep = currentStep?.nodeId === pb.result?.goalNodeId
      if (pb.isPlaybackComplete) {
        if (isGoalStep && pb.result?.pathFound) return 'step-goal' as SPPhase
        return pb.result?.pathFound ? 'done-found' as SPPhase : 'done-empty' as SPPhase
      }
      return isGoalStep ? 'step-goal' as SPPhase : 'step-explore' as SPPhase
    })(),
    spVarsRows: (() => {
      if (!pb.isRunning || !pb.result) return null
      if (pb.stepIndex < 0) {
        if (currentStrategy === 'bfs') {
          const startLabel = pb.result.steps[0].nodeLabel
          return [[`u = —`], [`queue = [${startLabel}]`], [`parent = {${startLabel}: —}`]]
        }
        return [[`u = —`, `nb = —`], [`inPath = {}`], [`bestPath = null`]]
      }
      const si = Math.min(pb.stepIndex, pb.result.steps.length - 1)
      const step = pb.result.steps[si]
      const isDone = pb.isPlaybackComplete
      if (currentStrategy === 'bfs') {
        // The goal is BFS's final step, so completion lands here in 'step-goal' (highlighting
        // "u ← dequeue" / "if u = goal"). Keep showing u and the queue rather than blanking to —.
        const isGoalDone = isDone && step.nodeId === pb.result.goalNodeId && pb.result.pathFound
        const blank = isDone && !isGoalDone
        const nodeById = blank ? null : new Map(nodes.map(n => [n.id, n]))
        const frontier = blank ? [] : step.frontierNodeIds.map(id => nodeById?.get(id)?.label ?? id)
        // parent fills on enqueue (`parent[nb] ← u`), so list every discovered node in enqueue
        // order — start, then each node as a step enqueued it — including still-queued ones.
        const labelByNodeId = new Map(nodes.map(n => [n.id, n.label]))
        const labelOf = (id: string) => labelByNodeId.get(id) ?? id
        const parentEntries = [`${pb.result.steps[0].nodeLabel}: —`]
        for (const s of pb.result.steps.slice(0, si + 1)) {
          for (const childId of s.enqueuedNodeIds ?? []) {
            parentEntries.push(`${labelOf(childId)}: ${s.nodeLabel}`)
          }
        }
        return [
          [`u = ${blank ? '—' : step.nodeLabel}`],
          [`queue = [${frontier.join(', ')}]`],
          [`parent = {${parentEntries.join(', ')}}`],
        ]
      }
      const inPathLabels: string[] = [step.nodeLabel]
      let fromId: string | null = step.fromNodeId
      let searchBefore = si
      while (fromId !== null) {
        let found = -1
        for (let i = searchBefore - 1; i >= 0; i--) {
          if (pb.result.steps[i].nodeId === fromId) { found = i; break }
        }
        if (found === -1) break
        inPathLabels.unshift(pb.result.steps[found].nodeLabel)
        fromId = pb.result.steps[found].fromNodeId
        searchBefore = found
      }
      let bestPathLabels: string[] | null = null
      if (isDone) {
        if (pb.result.pathFound) {
          const labelById = new Map(pb.result.steps.map(s => [s.nodeId, s.nodeLabel]))
          bestPathLabels = pb.result.pathNodeIds.map(id => labelById.get(id) ?? id)
        }
      } else {
        const currentBestLen = step.dfsBestPathLength ?? null
        if (currentBestLen !== null) {
          const bestGoalIdx = pb.result.steps.findIndex(
            (s, i) => i <= si && s.nodeId === pb.result!.goalNodeId && s.dfsBestPathLength === currentBestLen
          )
          if (bestGoalIdx !== -1) {
            bestPathLabels = [pb.result.steps[bestGoalIdx].nodeLabel]
            let bFrom: string | null = pb.result.steps[bestGoalIdx].fromNodeId
            let bSearch = bestGoalIdx
            while (bFrom !== null) {
              let found = -1
              for (let i = bSearch - 1; i >= 0; i--) {
                if (pb.result.steps[i].nodeId === bFrom) { found = i; break }
              }
              if (found === -1) break
              bestPathLabels.unshift(pb.result.steps[found].nodeLabel)
              bFrom = pb.result.steps[found].fromNodeId
              bSearch = found
            }
          }
        }
      }
      const row1 = isDone
        ? [`u = —`, `nb = —`]
        : step.fromNodeId === null
          ? [`u = ${step.nodeLabel}`, `nb = —`]
          : [`u = ${nodes.find(n => n.id === step.fromNodeId)?.label ?? '?'}`, `nb = ${step.nodeLabel}`]
      return [
        row1,
        [`inPath = {${inPathLabels.join(', ')}}`],
        [`bestPath = ${bestPathLabels ? '[' + bestPathLabels.join(', ') + ']' : 'null'}`],
      ]
    })(),
    startNodeLabel,
    goalNodeLabel,
    shortestPathNodeIds,
    shortestPathEdgeIds,

    isPlaying: pb.isPlaying,
    playbackSpeed: pb.playbackSpeed,
    stepIndex: pb.stepIndex,
    canStepBackward: pb.canStepBackward,
    canStepForward: pb.canStepForward,
    canTogglePlay: pb.canTogglePlay,
    isPlaybackComplete: pb.isPlaybackComplete,

    shortestPathOutput,

    resetShortestPathVisualization: pb.resetVisualization,
    clearShortestPathAlgorithmStateOnly: pb.clearStateOnly,
    runShortestPathFromSidebar,
    handleAlgorithmModeChangeFromSidebar: pb.handleAlgorithmModeChange,
    handleStartNodeLabelChange,
    handleGoalNodeLabelChange,
    stepShortestPathForward: pb.stepForward,
    stepShortestPathBackward: pb.stepBackward,
    playShortestPath: pb.play,
    pauseShortestPath: pb.pause,
    handleShortestPathPlaybackSpeedChange: pb.setPlaybackSpeed,
    canRunShortestPath,
    dfsBestPathLength: pb.result?.steps[pb.stepIndex]?.dfsBestPathLength ?? null,
  }
}
