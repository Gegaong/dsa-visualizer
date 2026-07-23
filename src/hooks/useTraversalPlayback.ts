import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type {
  GraphNode,
  GraphEdge,
  GoalType,
} from '../types'

import type { TraversalStrategy } from '../algorithms/graph/algorithmTypes'
import type { BfsResult } from '../algorithms/sharedSearchTypes'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
  PLAYBACK_DEFAULT_DELAY_MS,
} from '../utils/constants'

import {
  parseNumberInput,
  sanitizeNumericInput,
  sanitizeNodeLabelInput,
} from '../utils/format'

import { runDirectedGoalTraversal } from '../algorithms/graph/directedGoalTraversal'

import {
  buildTraversalCompletionStatus,
  prepareTraversalRunInputs,
} from '../algorithms/graph/traversalUIHelpers'

import { useStepPlayback } from './useStepPlayback'

function bfsDfsLabel(mode: TraversalStrategy): 'DFS' | 'BFS' {
  return mode === 'dfs' ? 'DFS' : 'BFS'
}

type UseTraversalPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  algorithmTab: TraversalStrategy
  // Clears any other canvas-algorithm visualizations (connected components, cycle detection) before a run.
  onClearOtherGraphAlgorithms: () => void
}

export type TraversalPhase = 'ready' | 'step-regular' | 'step-matched' | 'done-empty'

export type TraversalPlaybackHandle = {
  traversalVarsRows: string[][] | null
  goalType: GoalType
  setGoalType: (t: GoalType) => void
  startNodeLabel: string
  goalNodeLabel: string
  goalValueInput: string

  traversalVisitedNodeIds: string[]
  traversalVisitedEdgeIds: string[]
  traversalCurrentNodeId: string | null
  traversalCurrentEdgeId: string | null
  traversalStartNodeId: string | null
  traversalGoalNodeIds: string[]
  traversalFrontierNodeIds: string[]
  setTraversalVisitedNodeIds: (ids: string[]) => void
  setTraversalVisitedEdgeIds: (ids: string[]) => void
  setTraversalCurrentNodeId: (id: string | null) => void
  setTraversalCurrentEdgeId: (id: string | null) => void
  setTraversalStartNodeId: (id: string | null) => void
  setTraversalGoalNodeIds: (ids: string[]) => void
  setTraversalFrontierNodeIds: (ids: string[]) => void

  traversalStatusText: string
  isTraversalRunning: boolean
  traversalResult: BfsResult | null

  isPlaying: boolean
  playbackSpeed: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  resetTraversalVisualization: (idleAlgorithm?: TraversalStrategy) => void
  runTraversalFromSidebar: () => void
  handleGoalTypeChange: (type: GoalType) => void
  handleStartNodeLabelChange: (value: string) => void
  handleGoalNodeLabelChange: (value: string) => void
  handleGoalValueInputChange: (value: string) => void
  stepTraversalForward: () => void
  stepTraversalBackward: () => void
  playTraversal: () => void
  pauseTraversal: () => void
  handleTraversalPlaybackSpeedChange: (value: number) => void
  sidebarTraversalStatusText: string
  canRunTraversal: boolean
  traversalCurrentPhase: TraversalPhase | null
}

export function useTraversalPlayback({
  nodes,
  edges,
  algorithmTab,
  onClearOtherGraphAlgorithms,
}: UseTraversalPlaybackParams): TraversalPlaybackHandle {
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [goalValueInput, setGoalValueInput] = useState('')
  const [traversalVisitedNodeIds, setTraversalVisitedNodeIds] = useState<string[]>([])
  const [traversalVisitedEdgeIds, setTraversalVisitedEdgeIds] = useState<string[]>([])
  const [traversalCurrentNodeId, setTraversalCurrentNodeId] = useState<string | null>(null)
  const [traversalCurrentEdgeId, setTraversalCurrentEdgeId] = useState<string | null>(null)
  const [traversalStartNodeId, setTraversalStartNodeId] = useState<string | null>(null)
  const [traversalGoalNodeIds, setTraversalGoalNodeIds] = useState<string[]>([])
  const [traversalFrontierNodeIds, setTraversalFrontierNodeIds] = useState<string[]>([])
  const [traversalStatusText, setTraversalStatusText] = useState(
    'Enter start and goal, then run the selected algorithm.',
  )
  const [isTraversalRunning, setIsTraversalRunning] = useState(false)
  const [traversalResult, setTraversalResult] = useState<BfsResult | null>(null)
  const traversalResultRef = useRef<BfsResult | null>(null)
  const initialGoalNodeIdsRef = useRef<string[]>([])
  const finalizeTraversalRunRef = useRef<(r: BfsResult) => void>(() => {})
  const traversalPlaybackStopRef = useRef(() => {})
  const [traversalPlaybackSession, setTraversalPlaybackSession] = useState(0)

  useEffect(() => {
    traversalResultRef.current = traversalResult
  }, [traversalResult])

  const applyTraversalStepIndex = (result: BfsResult, index: number) => {
    const algoName = bfsDfsLabel(algorithmTab)
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalVisitedEdgeIds([])
      setTraversalFrontierNodeIds([])
      setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
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
    setTraversalFrontierNodeIds(currentStep.frontierNodeIds)
    setTraversalStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length})`,
    )
  }

  const traversalPlayback = useStepPlayback({
    stepCount: traversalResult?.steps.length ?? 0,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    defaultDelay: PLAYBACK_DEFAULT_DELAY_MS,
    resetSignal: traversalPlaybackSession,
    onStepIndexChange: (index) => {
      const r = traversalResultRef.current
      if (!r) return
      applyTraversalStepIndex(r, index)
    },
    onComplete: () => {
      const r = traversalResultRef.current
      if (r) finalizeTraversalRunRef.current(r)
    },
  })

  useEffect(() => {
    finalizeTraversalRunRef.current = (result: BfsResult) => {
      traversalPlayback.stopPlayback()
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalFrontierNodeIds([])

      if (!result.foundNodeLabel) {
        setTraversalStatusText('Done. Goal not found in reachable nodes.')
        return
      }

      if (result.foundNodeIds.length > 0) {
        setTraversalGoalNodeIds(result.foundNodeIds)
      }
      setTraversalStatusText(buildTraversalCompletionStatus(result, nodes))
    }
  }, [algorithmTab, nodes, traversalPlayback])

  useEffect(() => {
    traversalPlaybackStopRef.current = () => traversalPlayback.stopPlayback()
  }, [traversalPlayback])

  const resetTraversalVisualization = useCallback(
    (idleAlgorithm?: TraversalStrategy) => {
      // Ignore non-string args (defensive if this is ever wired directly to onClick).
      const algo =
        idleAlgorithm === 'bfs' || idleAlgorithm === 'dfs' ? idleAlgorithm : algorithmTab

      traversalPlaybackStopRef.current()
      setTraversalVisitedNodeIds([])
      setTraversalVisitedEdgeIds([])
      setTraversalCurrentNodeId(null)
      setTraversalCurrentEdgeId(null)
      setTraversalStartNodeId(null)
      setTraversalGoalNodeIds([])
      setTraversalFrontierNodeIds([])
      setTraversalResult(null)
      setTraversalPlaybackSession((s) => s + 1)
      const algoName = bfsDfsLabel(algo)
      setTraversalStatusText(`Enter start and goal, then run ${algoName}.`)
      setIsTraversalRunning(false)
    },
    [algorithmTab],
  )

  const runTraversalFromSidebar = () => {
    if (traversalPlayback.isPlaying) return
    traversalPlaybackStopRef.current()
    onClearOtherGraphAlgorithms()
    setTraversalVisitedNodeIds([])
    setTraversalVisitedEdgeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalGoalNodeIds([])

    const traversalSidebarInputs = { nodes, goalType, startNodeLabel, goalNodeLabel, goalValueInput }
    const preparation = prepareTraversalRunInputs(algorithmTab, traversalSidebarInputs)

    if (preparation.ok === false) {
      setTraversalStatusText(preparation.error)
      return
    }

    initialGoalNodeIdsRef.current = preparation.initialGoalNodeIds
    setTraversalGoalNodeIds(preparation.initialGoalNodeIds)
    setTraversalStartNodeId(preparation.startNode.id)

    const runInput = {
      nodes,
      edges,
      startNodeLabel: preparation.startNode.label,
      goal: preparation.goal,
    }
    const algoName = bfsDfsLabel(algorithmTab)
    const result = runDirectedGoalTraversal(runInput, algorithmTab)

    if (result.steps.length === 0) {
      setTraversalStatusText(`${algoName} could not start with the current graph and inputs.`)
      return
    }

    setTraversalResult(result)
    setTraversalPlaybackSession((s) => s + 1)
    setIsTraversalRunning(true)
    setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
  }

  const handleGoalTypeChange = (type: GoalType) => {
    resetTraversalVisualization()
    setGoalType(type)
    setGoalNodeLabel('')
    setGoalValueInput('')
  }

  const handleStartNodeLabelChange = (value: string) => {
    resetTraversalVisualization()
    setStartNodeLabel(sanitizeNodeLabelInput(value))
  }

  const handleGoalNodeLabelChange = (value: string) => {
    resetTraversalVisualization()
    setGoalNodeLabel(sanitizeNodeLabelInput(value))
  }

  const handleGoalValueInputChange = (value: string) => {
    resetTraversalVisualization()
    setGoalValueInput(sanitizeNumericInput(value))
  }

  const stepTraversalForward = () => {
    if (!traversalResult) return
    traversalPlayback.stepForward()
  }

  const stepTraversalBackward = () => {
    if (!traversalResult) return
    traversalPlayback.stepBackward()
    setIsTraversalRunning(true)
    setTraversalGoalNodeIds(initialGoalNodeIdsRef.current)
  }

  const playTraversal = () => {
    if (!traversalResult) return
    const replayFromEnd = traversalPlayback.isPlaybackComplete
    traversalPlayback.togglePlay()
    if (replayFromEnd) {
      setTraversalGoalNodeIds(initialGoalNodeIdsRef.current)
      setIsTraversalRunning(true)
    }
  }

  const pauseTraversal = () => {
    traversalPlayback.stopPlayback()
  }

  const handleTraversalPlaybackSpeedChange = (value: number) => {
    traversalPlayback.setPlaybackSpeed(value)
  }

  const hasEmptyNodes = nodes.some((node) => node.value === 'empty')

  const canRunTraversal =
    nodes.length > 0 &&
    (goalType === 'target-node' || !hasEmptyNodes) &&
    startNodeLabel.trim() !== '' &&
    (goalType !== 'target-node' || goalNodeLabel.trim() !== '') &&
    (goalType !== 'target-value' || parseNumberInput(goalValueInput) !== null)

  const startNodeMissing = startNodeLabel.trim() === ''
  const goalNodeMissing = goalType === 'target-node' && goalNodeLabel.trim() === ''
  const goalValueMissing = goalType === 'target-value' && parseNumberInput(goalValueInput) === null

  let sidebarTraversalStatusText = traversalStatusText
  if (startNodeMissing && goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal node are required fields.'
  } else if (startNodeMissing && goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal value are required fields.'
  } else if (startNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node is a required field.'
  } else if (goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Goal node is a required field.'
  } else if (goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Goal value is a required field.'
  } else if (hasEmptyNodes && goalType !== 'target-node') {
    const algoName = bfsDfsLabel(algorithmTab)
    sidebarTraversalStatusText = `Warning: fill or nullify all empty nodes before running ${algoName}.`
  }

  return {
    goalType,
    setGoalType,
    startNodeLabel,
    goalNodeLabel,
    goalValueInput,

    traversalVisitedNodeIds,
    traversalVisitedEdgeIds,
    traversalCurrentNodeId,
    traversalCurrentEdgeId,
    traversalStartNodeId,
    traversalGoalNodeIds,
    traversalFrontierNodeIds,
    setTraversalVisitedNodeIds,
    setTraversalVisitedEdgeIds,
    setTraversalCurrentNodeId,
    setTraversalCurrentEdgeId,
    setTraversalStartNodeId,
    setTraversalGoalNodeIds,
    setTraversalFrontierNodeIds,

    traversalStatusText,
    isTraversalRunning,
    traversalResult,

    isPlaying: traversalPlayback.isPlaying,
    playbackSpeed: traversalPlayback.playbackSpeed,
    canStepBackward: traversalResult !== null && traversalPlayback.canStepBackward,
    canStepForward: traversalResult !== null && traversalPlayback.canStepForward,
    canTogglePlay: traversalResult !== null && traversalPlayback.canTogglePlay,
    isPlaybackComplete: traversalResult !== null && traversalPlayback.isPlaybackComplete,

    resetTraversalVisualization,
    runTraversalFromSidebar,
    handleGoalTypeChange,
    handleStartNodeLabelChange,
    handleGoalNodeLabelChange,
    handleGoalValueInputChange,
    stepTraversalForward,
    stepTraversalBackward,
    playTraversal,
    pauseTraversal,
    handleTraversalPlaybackSpeedChange,
    sidebarTraversalStatusText,
    canRunTraversal,
    traversalVarsRows: (() => {
      if (!isTraversalRunning || !traversalResult) return null
      if (traversalPlayback.stepIndex < 0) {
        const algoKey = algorithmTab === 'bfs' ? 'queue' : 'stack'
        const firstLabel = traversalResult.steps[0].nodeLabel
        if (goalType === 'max-value') return [[`node = —`, `max = —`], [`${algoKey} = [${firstLabel}]`], [`visited = []`]]
        if (goalType === 'min-value') return [[`node = —`, `min = —`], [`${algoKey} = [${firstLabel}]`], [`visited = []`]]
        if (goalType === 'target-node') return [[`node = —`, `goal = "${goalNodeLabel}"`], [`${algoKey} = [${firstLabel}]`], [`visited = []`]]
        return [[`node = —`, `goal = ${goalValueInput}`], [`${algoKey} = [${firstLabel}]`], [`visited = []`]]
      }
      const si = Math.min(traversalPlayback.stepIndex, traversalResult.steps.length - 1)
      const step = traversalResult.steps[si]
      const algoKey = algorithmTab === 'bfs' ? 'queue' : 'stack'
      const isDone = traversalPlayback.isPlaybackComplete
      // A found target lands on the final step in the 'step-matched' phase (highlighting "node ← dequeue" /
      // "if node = goal → return node"), so keep showing the matched node and its frontier. Every other
      // completion is terminal (queue exhausted / max-min finished) and blanks out to node = — , empty frontier.
      const isMatchedDone =
        isDone &&
        (goalType === 'target-node' || goalType === 'target-value') &&
        traversalResult.foundNodeId === step.nodeId
      const showTerminal = isDone && !isMatchedDone
      const nodeVal = showTerminal ? '—' : step.nodeLabel
      const nodeById = showTerminal ? null : new Map(nodes.map(n => [n.id, n]))
      const frontier = showTerminal ? [] : step.frontierNodeIds.map(id => nodeById?.get(id)?.label ?? id)
      const visitedLabels = traversalResult.steps.slice(0, si + 1).map(s => s.nodeLabel)
      const row2 = [`${algoKey} = [${frontier.join(', ')}]`]
      const row3 = [`visited = [${visitedLabels.join(', ')}]`]
      if (goalType === 'max-value' || goalType === 'min-value') {
        const bestKey = goalType === 'max-value' ? 'max' : 'min'
        const bestVal = isDone ? traversalResult.foundValue : (step.runningBest ?? null)
        return [[`node = ${nodeVal}`, `${bestKey} = ${bestVal ?? '—'}`], row2, row3]
      }
      if (goalType === 'target-node') return [[`node = ${nodeVal}`, `goal = "${goalNodeLabel}"`], row2, row3]
      return [[`node = ${nodeVal}`, `goal = ${goalValueInput}`], row2, row3]
    })(),
    traversalCurrentPhase: (() => {
      if (!isTraversalRunning) return null as TraversalPhase | null
      const stepIndex = traversalPlayback.stepIndex
      if (stepIndex < 0) return 'ready' as TraversalPhase
      if (traversalPlayback.isPlaybackComplete) {
        if (goalType === 'max-value' || goalType === 'min-value') return 'done-empty' as TraversalPhase
        return traversalResult?.foundNodeId ? 'step-matched' as TraversalPhase : 'done-empty' as TraversalPhase
      }
      if (goalType === 'target-node' || goalType === 'target-value') {
        const currentStep = traversalResult?.steps[stepIndex]
        if (currentStep && traversalResult?.foundNodeId === currentStep.nodeId) return 'step-matched' as TraversalPhase
      }
      return 'step-regular' as TraversalPhase
    })(),
  }
}
