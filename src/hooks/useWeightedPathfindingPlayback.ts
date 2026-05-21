import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import type { GraphEdge, GraphNode } from '../types'

import type { TraversalStrategy, WeightedPathResult } from '../algorithms/algorithmstypes'

import type { WPOutput } from '../components/sidebar/sidebarTypes'

import {
  runWeightedPathfinding,
  getDirectedEdgeId,
} from '../algorithms/weightedPathfinding'

import {
  buildWPCompletionStatus,
  formatWPPathNodeLabels,
} from '../algorithms/weightedPathfindingUIHelpers'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
} from '../utils/constants'

import { useStepPlayback } from './useStepPlayback'

const IDLE_STATUS = 'Enter start and goal node labels, then run the pathfinder.'

export type WPPlaybackHandle = {
  isWPRunning: boolean
  wpResult: WeightedPathResult | null
  wpStatusText: string
  startNodeLabel: string
  goalNodeLabel: string

  // Visual state for the canvas (derived per step)
  wpSettledNodeIds: string[]
  wpTentativeNodeIds: string[]
  wpCurrentNodeId: string | null
  wpStartNodeId: string | null
  wpGoalNodeId: string | null
  wpCostByNodeId: Map<string, number>
  wpPathNodeIds: string[]
  wpPathEdgeIds: string[]
  wpCurrentEdgeId: string | null
  wpVisitedEdgeIds: string[]

  // Playback controls
  isPlaying: boolean
  playbackSpeed: number
  stepIndex: number
  canStepBackward: boolean
  canStepForward: boolean
  canTogglePlay: boolean
  isPlaybackComplete: boolean

  wpOutput: WPOutput
  canRunWP: boolean
  isDetailedMode: boolean
  wpActiveStepTotal: number

  runWPFromSidebar: (strategy: TraversalStrategy) => void
  resetWPVisualization: () => void
  handleStartNodeLabelChange: (value: string) => void
  handleGoalNodeLabelChange: (value: string) => void
  stepWPForward: () => void
  stepWPBackward: () => void
  playWP: () => void
  pauseWP: () => void
  handleWPPlaybackSpeedChange: (value: number) => void
  toggleDetailedMode: () => void
}

type UseWPPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export function useWeightedPathfindingPlayback({
  nodes,
  edges,
}: UseWPPlaybackParams): WPPlaybackHandle {
  const [result, setResult] = useState<WeightedPathResult | null>(null)
  const resultRef = useRef<WeightedPathResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState(IDLE_STATUS)
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const strategyRef = useRef<TraversalStrategy>('bfs')
  const [playbackSession, setPlaybackSession] = useState(0)
  const [isDetailedMode, setIsDetailedMode] = useState(false)
  const isDetailedModeRef = useRef(false)

  // Visual state derived on each step
  const [wpSettledNodeIds, setWpSettledNodeIds] = useState<string[]>([])
  const [wpTentativeNodeIds, setWpTentativeNodeIds] = useState<string[]>([])
  const [wpCurrentNodeId, setWpCurrentNodeId] = useState<string | null>(null)
  const [wpStartNodeId, setWpStartNodeId] = useState<string | null>(null)
  const [wpGoalNodeId, setWpGoalNodeId] = useState<string | null>(null)
  const [wpCostByNodeId, setWpCostByNodeId] = useState<Map<string, number>>(new Map())
  const [wpPathNodeIds, setWpPathNodeIds] = useState<string[]>([])
  const [wpPathEdgeIds, setWpPathEdgeIds] = useState<string[]>([])
  const [wpCurrentEdgeId, setWpCurrentEdgeId] = useState<string | null>(null)
  const [wpVisitedEdgeIds, setWpVisitedEdgeIds] = useState<string[]>([])

  useEffect(() => {
    resultRef.current = result
  }, [result])

  // Rebuilds the visual snapshot from steps[0..index] on every step change.
  const applyStep = useCallback(
    (r: WeightedPathResult, index: number) => {
      const detailed = isDetailedModeRef.current
      const activeSteps = detailed ? r.detailedSteps : r.steps
      const strategyLabel = strategyRef.current === 'bfs' ? 'BFS' : 'DFS'

      if (index < 0) {
        setWpSettledNodeIds([])
        setWpTentativeNodeIds([])
        setWpCurrentNodeId(null)
        setWpCurrentEdgeId(null)
        setWpCostByNodeId(new Map())
        setWpVisitedEdgeIds([])
        setWpStartNodeId(r.startNodeId)
        setWpGoalNodeId(r.goalNodeId)
        setWpPathNodeIds([])
        setWpPathEdgeIds([])
        setStatusText(`Pathfinder (${strategyLabel}) ready. Press Play or step through manually.`)
        return
      }

      const bound = Math.min(index, activeSteps.length - 1)
      const currentStep = activeSteps[bound]
      const visibleSteps = activeSteps.slice(0, bound + 1)

      const settledSet = new Set<string>()
      const tentativeMap = new Map<string, number>()
      const costByNodeId = new Map<string, number>()

      if (detailed) {
        // Detailed mode: settle steps explicitly move nodes from yellow to green.
        for (const step of visibleSteps) {
          if (step.eventType === 'settle') {
            settledSet.add(step.nodeId)
            tentativeMap.delete(step.nodeId)
            costByNodeId.set(step.nodeId, step.costToNode)
          } else {
            if (!settledSet.has(step.nodeId)) {
              const existing = tentativeMap.get(step.nodeId)
              if (existing === undefined || step.costToNode < existing) {
                tentativeMap.set(step.nodeId, step.costToNode)
                costByNodeId.set(step.nodeId, step.costToNode)
              }
            }
          }
        }
      } else {
        // Non-detailed mode: infer settled nodes from minPendingCostAfter.
        const bestKnownCost = new Map<string, number>()
        for (const step of visibleSteps) {
          const existing = bestKnownCost.get(step.nodeId)
          if (existing === undefined || step.costToNode < existing) {
            bestKnownCost.set(step.nodeId, step.costToNode)
          }
          const mpc = step.minPendingCostAfter
          for (const [id, knownCost] of bestKnownCost) {
            if (!settledSet.has(id) && knownCost <= mpc) {
              settledSet.add(id)
            }
          }
        }
        for (const [id, cost] of bestKnownCost) {
          costByNodeId.set(id, cost)
          if (!settledSet.has(id)) tentativeMap.set(id, cost)
        }
      }

      const visitedEdgeSet = new Set<string>()
      for (const step of visibleSteps) {
        if (step.eventType === 'discover' && step.fromNodeId !== null) {
          const edgeId = getDirectedEdgeId(edges, step.fromNodeId, step.nodeId)
          if (edgeId) visitedEdgeSet.add(edgeId)
        }
      }

      const currentEdgeId = currentStep.fromNodeId !== null
        ? getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
        : null

      const statusMsg = detailed && currentStep.eventType === 'settle'
        ? (currentStep.settleReason ?? `${currentStep.nodeLabel} confirmed at cost ${currentStep.costToNode}`)
        : `Visiting ${currentStep.nodeLabel} · current path cost ${currentStep.costToNode} (step ${bound + 1}/${activeSteps.length}) · ${strategyLabel}`

      setWpSettledNodeIds([...settledSet])
      setWpTentativeNodeIds([...tentativeMap.keys()])
      setWpCurrentNodeId(currentStep.eventType === 'settle' ? null : currentStep.nodeId)
      setWpCurrentEdgeId(currentStep.eventType === 'settle' ? null : currentEdgeId)
      setWpCostByNodeId(costByNodeId)
      setWpVisitedEdgeIds([...visitedEdgeSet])
      setWpStartNodeId(r.startNodeId)
      setWpGoalNodeId(r.goalNodeId)
      setWpPathNodeIds([])
      setWpPathEdgeIds([])
      setStatusText(statusMsg)
    },
    [edges],
  )

  const applyStepRef = useRef(applyStep)
  useLayoutEffect(() => {
    applyStepRef.current = applyStep
  })

  // Builds the path edge ids from pathNodeIds.
  const buildPathEdgeIds = useCallback(
    (pathNodeIds: string[]): string[] => {
      const result: string[] = []
      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const edgeId = getDirectedEdgeId(edges, pathNodeIds[i], pathNodeIds[i + 1])
        if (edgeId) result.push(edgeId)
      }
      return result
    },
    [edges],
  )

  const finalizeRef = useRef<(r: WeightedPathResult) => void>(() => {})

  const activeStepCount = isDetailedMode
    ? (result?.detailedSteps.length ?? 0)
    : (result?.steps.length ?? 0)

  const playback = useStepPlayback({
    stepCount: activeStepCount,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    resetSignal: playbackSession,
    onStepIndexChange: (index) => {
      const r = resultRef.current
      if (!r) return
      applyStepRef.current(r, index)
    },
    onComplete: () => {
      const r = resultRef.current
      if (r) finalizeRef.current(r)
    },
  })

  useEffect(() => {
    finalizeRef.current = (r: WeightedPathResult) => {
      playback.stopPlayback()
      setWpCurrentNodeId(null)
      setWpCurrentEdgeId(null)
      // applyStep was called for every step up to the last one, so settled/tentative/cost
      // state is already fully correct. Just overlay the final path and completion message.
      const pathEdgeIds = buildPathEdgeIds(r.pathNodeIds)
      setWpPathNodeIds(r.pathFound ? r.pathNodeIds : [])
      setWpPathEdgeIds(r.pathFound ? pathEdgeIds : [])
      setStatusText(buildWPCompletionStatus(r, nodes, strategyRef.current))
    }
  }, [playback, nodes, buildPathEdgeIds])

  const clearVisuals = useCallback(() => {
    setWpSettledNodeIds([])
    setWpTentativeNodeIds([])
    setWpCurrentNodeId(null)
    setWpCurrentEdgeId(null)
    setWpStartNodeId(null)
    setWpGoalNodeId(null)
    setWpCostByNodeId(new Map())
    setWpPathNodeIds([])
    setWpPathEdgeIds([])
    setWpVisitedEdgeIds([])
  }, [])

  const resetWPVisualization = useCallback(() => {
    playback.stopPlayback()
    setResult(null)
    setPlaybackSession((s) => s + 1)
    setIsRunning(false)
    clearVisuals()
    setStatusText(IDLE_STATUS)
  }, [playback, clearVisuals])

  const runWPFromSidebar = useCallback(
    (strategy: TraversalStrategy) => {
      if (playback.isPlaying) return
      playback.stopPlayback()
      resetWPVisualization()
      strategyRef.current = strategy

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

      const r = runWeightedPathfinding(nodes, edges, startNode.id, goalNode.id, strategy)

      if (r.steps.length === 0) {
        setStatusText('Pathfinder could not run on this graph.')
        return
      }

      const strategyLabel = strategy === 'bfs' ? 'BFS' : 'DFS'
      setResult(r)
      setPlaybackSession((s) => s + 1)
      setIsRunning(true)
      setWpStartNodeId(startNode.id)
      setWpGoalNodeId(goalNode.id)
      setStatusText(`Pathfinder (${strategyLabel}) ready. Press Play or step through manually.`)
    },
    [playback, resetWPVisualization, nodes, edges, startNodeLabel, goalNodeLabel],
  )

  const handleStartNodeLabelChange = useCallback((value: string) => {
    setStartNodeLabel(value.toUpperCase())
  }, [])

  const handleGoalNodeLabelChange = useCallback((value: string) => {
    setGoalNodeLabel(value.toUpperCase())
  }, [])

  const stepWPForward = useCallback(() => {
    if (!result) return
    playback.stepForward()
  }, [result, playback])

  const stepWPBackward = useCallback(() => {
    if (!result) return
    playback.stepBackward()
    setIsRunning(true)
    setWpPathNodeIds([])
    setWpPathEdgeIds([])
  }, [result, playback])

  const playWP = useCallback(() => {
    if (!result) return
    const activeLen = isDetailedModeRef.current ? result.detailedSteps.length : result.steps.length
    const replayFromEnd = playback.stepIndex >= activeLen - 1
    playback.togglePlay()
    if (replayFromEnd) {
      setIsRunning(true)
      setWpPathNodeIds([])
      setWpPathEdgeIds([])
    }
  }, [result, playback])

  const pauseWP = useCallback(() => {
    playback.stopPlayback()
  }, [playback])

  const toggleDetailedMode = useCallback(() => {
    setIsDetailedMode((prev) => {
      isDetailedModeRef.current = !prev
      return !prev
    })
  }, [])

  const startMissing = startNodeLabel.trim() === ''
  const goalMissing = goalNodeLabel.trim() === ''
  const canRunWP = nodes.length > 0 && !startMissing && !goalMissing

  let wpStatusText = statusText
  if (startMissing && goalMissing) {
    wpStatusText = 'Warning: Start node and Goal node are required fields.'
  } else if (startMissing) {
    wpStatusText = 'Warning: Start node is a required field.'
  } else if (goalMissing) {
    wpStatusText = 'Warning: Goal node is a required field.'
  }

  const wpOutput: WPOutput =
    result !== null
      ? {
          pathFound: result.pathFound,
          pathCost: result.pathCost,
          pathNodeLabels: formatWPPathNodeLabels(result, nodes),
        }
      : null

  return {
    isWPRunning: isRunning,
    wpResult: result,
    wpStatusText,
    startNodeLabel,
    goalNodeLabel,

    wpSettledNodeIds,
    wpTentativeNodeIds,
    wpCurrentNodeId,
    wpStartNodeId,
    wpGoalNodeId,
    wpCostByNodeId,
    wpPathNodeIds,
    wpPathEdgeIds,
    wpCurrentEdgeId,
    wpVisitedEdgeIds,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    stepIndex: playback.stepIndex,
    canStepBackward: result !== null && playback.canStepBackward,
    canStepForward: result !== null && playback.canStepForward,
    canTogglePlay: result !== null && playback.canTogglePlay,
    isPlaybackComplete: result !== null && playback.isPlaybackComplete,

    wpOutput,
    canRunWP,
    isDetailedMode,
    wpActiveStepTotal: activeStepCount,

    runWPFromSidebar,
    resetWPVisualization,
    handleStartNodeLabelChange,
    handleGoalNodeLabelChange,
    stepWPForward,
    stepWPBackward,
    playWP,
    pauseWP,
    handleWPPlaybackSpeedChange: playback.setPlaybackSpeed,
    toggleDetailedMode,
  }
}
