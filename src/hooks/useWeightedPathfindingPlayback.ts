import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

export type WPPhase = 'ready' | 'step-start' | 'step-discover' | 'step-settle' | 'done-found' | 'done-empty'

import type { GraphEdge, GraphNode } from '../types'

import type {
  PriorityPathResult,
  WeightedAlgorithm,
  WeightedPathResult,
} from '../algorithms/graph/algorithmTypes'

import type { WPOutput } from '../components/sidebar/sidebarTypes'

import {
  runWeightedPathfinding,
  getDirectedEdgeId,
  getDirectedEdgeInfo,
} from '../algorithms/graph/weightedPathfinding'

import { formatCost, sanitizeNodeLabelInput } from '../utils/format'

import { runDijkstra, runAStar, runGreedy } from '../algorithms/graph/priorityPathfinding'

import {
  buildWPCompletionStatus,
  buildPriorityCompletionStatus,
  formatWPPathNodeLabels,
  formatPriorityPathNodeLabels,
} from '../algorithms/graph/weightedPathfindingUIHelpers'

import {
  PLAYBACK_MIN_DELAY_MS,
  PLAYBACK_MAX_DELAY_MS,
  PLAYBACK_DEFAULT_DELAY_MS,
} from '../utils/constants'

import { useStepPlayback } from './useStepPlayback'

const IDLE_STATUS = 'Enter start and goal node labels, then run the pathfinder.'

type AnyResult = WeightedPathResult | PriorityPathResult

export type WPPlaybackHandle = {
  isWPRunning: boolean
  wpResult: AnyResult | null
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
  wpVisitedEdgeFwdIds: string[]
  wpVisitedEdgeRevIds: string[]

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
  wpActiveStepTotal: number
  wpQueueSize: number | null
  wpNodesSettled: number
  wpAssumedNodeIds: string[]
  wpPathGuaranteed: boolean
  wpCurrentPhase: WPPhase | null
  wpVarsRows: string[][] | null

  runWPFromSidebar: (algorithm: WeightedAlgorithm) => void
  resetWPVisualization: () => void
  handleStartNodeLabelChange: (value: string) => void
  handleGoalNodeLabelChange: (value: string) => void
  stepWPForward: () => void
  stepWPBackward: () => void
  playWP: () => void
  pauseWP: () => void
  handleWPPlaybackSpeedChange: (value: number) => void
}

type UseWPPlaybackParams = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  pixelsPerUnit: number
}

function algorithmLabel(algorithm: WeightedAlgorithm): string {
  if (algorithm === 'bfs') return 'BFS'
  if (algorithm === 'dfs') return 'DFS'
  if (algorithm === 'dijkstra') return 'Dijkstra'
  if (algorithm === 'astar') return 'A*'
  return 'Greedy'
}

export function useWeightedPathfindingPlayback({
  nodes,
  edges,
  pixelsPerUnit,
}: UseWPPlaybackParams): WPPlaybackHandle {
  const [result, setResult] = useState<AnyResult | null>(null)
  const resultRef = useRef<AnyResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [statusText, setStatusText] = useState(IDLE_STATUS)
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const algorithmRef = useRef<WeightedAlgorithm>('bfs')
  const [wpAlgorithm, setWpAlgorithm] = useState<WeightedAlgorithm>('bfs')
  const [playbackSession, setPlaybackSession] = useState(0)

  // Visual state derived on each step
  const [wpSettledNodeIds, setWpSettledNodeIds] = useState<string[]>([])
  const [wpTentativeNodeIds, setWpTentativeNodeIds] = useState<string[]>([])
  const [wpAssumedNodeIds, setWpAssumedNodeIds] = useState<string[]>([])
  const [wpCurrentNodeId, setWpCurrentNodeId] = useState<string | null>(null)
  const [wpStartNodeId, setWpStartNodeId] = useState<string | null>(null)
  const [wpGoalNodeId, setWpGoalNodeId] = useState<string | null>(null)
  const [wpCostByNodeId, setWpCostByNodeId] = useState<Map<string, number>>(new Map())
  const [wpPathNodeIds, setWpPathNodeIds] = useState<string[]>([])
  const [wpPathEdgeIds, setWpPathEdgeIds] = useState<string[]>([])
  const [wpCurrentEdgeId, setWpCurrentEdgeId] = useState<string | null>(null)
  const [wpVisitedEdgeIds, setWpVisitedEdgeIds] = useState<string[]>([])
  const [wpVisitedEdgeFwdIds, setWpVisitedEdgeFwdIds] = useState<string[]>([])
  const [wpVisitedEdgeRevIds, setWpVisitedEdgeRevIds] = useState<string[]>([])
  const [wpQueueSize, setWpQueueSize] = useState<number | null>(null)

  useEffect(() => {
    resultRef.current = result
  }, [result])

  // Rebuilds the visual snapshot from steps[0..index] on every step change.
  const applyStep = useCallback(
    (r: AnyResult, index: number) => {
      const label = algorithmLabel(algorithmRef.current)

      if (r.kind === 'bfsdfs') {
        const activeSteps = r.steps

        if (index < 0) {
          setWpSettledNodeIds([])
          setWpTentativeNodeIds([])
          setWpAssumedNodeIds([])
          setWpCurrentNodeId(null)
          setWpCurrentEdgeId(null)
          setWpCostByNodeId(new Map())
          setWpVisitedEdgeIds([])
          setWpVisitedEdgeFwdIds([])
          setWpVisitedEdgeRevIds([])
          setWpStartNodeId(r.startNodeId)
          setWpGoalNodeId(r.goalNodeId)
          setWpPathNodeIds([])
          setWpPathEdgeIds([])
          setWpQueueSize(null)
          setStatusText(`Pathfinder (${label}) ready. Press Play or step through manually.`)
          return
        }

        const bound = Math.min(index, activeSteps.length - 1)
        const currentStep = activeSteps[bound]
        const visibleSteps = activeSteps.slice(0, bound + 1)
        const settledSet = new Set<string>()
        const tentativeMap = new Map<string, number>()
        const costByNodeId = new Map<string, number>()

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

        const visitedEdgeSet = new Set<string>()
        const visitedEdgeFwdSet = new Set<string>()
        const visitedEdgeRevSet = new Set<string>()
        for (const step of visibleSteps) {
          if (step.eventType === 'discover' && step.fromNodeId !== null) {
            const info = getDirectedEdgeInfo(edges, step.fromNodeId, step.nodeId)
            if (info) {
              visitedEdgeSet.add(info.id)
              if (info.isForward) visitedEdgeFwdSet.add(info.id)
              else visitedEdgeRevSet.add(info.id)
            }
          }
        }

        const currentEdgeId = currentStep.fromNodeId !== null
          ? getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
          : null

        const statusMsg = currentStep.eventType === 'settle'
          ? (currentStep.settleReason ?? `${currentStep.nodeLabel} confirmed at cost ${formatCost(currentStep.costToNode)}`)
          : `Visiting ${currentStep.nodeLabel} · current path cost ${formatCost(currentStep.costToNode)} (step ${bound + 1}/${activeSteps.length}) · ${label}`

        setWpSettledNodeIds([...settledSet])
        setWpTentativeNodeIds([...tentativeMap.keys()])
        setWpCurrentNodeId(currentStep.eventType === 'settle' ? null : currentStep.nodeId)
        setWpCurrentEdgeId(currentStep.eventType === 'settle' ? null : currentEdgeId)
        setWpCostByNodeId(costByNodeId)
        setWpVisitedEdgeIds([...visitedEdgeSet])
        setWpVisitedEdgeFwdIds([...visitedEdgeFwdSet])
        setWpVisitedEdgeRevIds([...visitedEdgeRevSet])
        setWpStartNodeId(r.startNodeId)
        setWpGoalNodeId(r.goalNodeId)
        setWpPathNodeIds([])
        setWpPathEdgeIds([])
        setWpQueueSize(null)
        setStatusText(statusMsg)
      } else {
        if (index < 0) {
          setWpSettledNodeIds([])
          setWpTentativeNodeIds([])
          setWpAssumedNodeIds([])
          setWpCurrentNodeId(null)
          setWpCurrentEdgeId(null)
          setWpCostByNodeId(new Map())
          setWpVisitedEdgeIds([])
          setWpVisitedEdgeFwdIds([])
          setWpVisitedEdgeRevIds([])
          setWpStartNodeId(r.startNodeId)
          setWpGoalNodeId(r.goalNodeId)
          setWpPathNodeIds([])
          setWpPathEdgeIds([])
          setWpQueueSize(null)
          setStatusText(`Pathfinder (${label}) ready. Press Play or step through manually.`)
          return
        }

        const bound = Math.min(index, r.steps.length - 1)
        const currentStep = r.steps[bound]
        const visibleSteps = r.steps.slice(0, bound + 1)
        const settledSet = new Set<string>()
        const assumedSet = new Set<string>()
        const tentativeMap = new Map<string, number>()
        const costByNodeId = new Map<string, number>()

        for (const step of visibleSteps) {
          if (step.eventType === 'settle') {
            settledSet.add(step.nodeId)
            tentativeMap.delete(step.nodeId)
            costByNodeId.set(step.nodeId, step.gCost)
          } else if (step.eventType === 'assumed') {
            assumedSet.add(step.nodeId)
            tentativeMap.delete(step.nodeId)
            costByNodeId.set(step.nodeId, step.gCost)
          } else {
            if (!settledSet.has(step.nodeId) && !assumedSet.has(step.nodeId)) {
              const existing = tentativeMap.get(step.nodeId)
              if (existing === undefined || step.gCost < existing) {
                tentativeMap.set(step.nodeId, step.gCost)
                costByNodeId.set(step.nodeId, step.gCost)
              }
            }
          }
        }

        const visitedEdgeSet = new Set<string>()
        const visitedEdgeFwdSet = new Set<string>()
        const visitedEdgeRevSet = new Set<string>()
        for (const step of visibleSteps) {
          if (step.eventType === 'discover' && step.fromNodeId !== null) {
            const info = getDirectedEdgeInfo(edges, step.fromNodeId, step.nodeId)
            if (info) {
              visitedEdgeSet.add(info.id)
              if (info.isForward) visitedEdgeFwdSet.add(info.id)
              else visitedEdgeRevSet.add(info.id)
            }
          }
        }

        const currentEdgeId = currentStep.eventType === 'discover' && currentStep.fromNodeId !== null
          ? getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
          : null

        const algo = algorithmRef.current
        const h = formatCost(currentStep.hCost)
        let discoverMsg: string
        if (algo === 'greedy') {
          discoverMsg = currentStep.fromNodeId === null
            ? `${currentStep.nodeLabel} queued — start node (h = ${h}) · Greedy`
            : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (h = ${h}) · Greedy`
        } else if (algo === 'astar') {
          const f = formatCost(currentStep.priority)
          discoverMsg = currentStep.fromNodeId === null
            ? `${currentStep.nodeLabel} queued — start node (g = 0, h = ${h}, f = ${h}) · A*`
            : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (edge +${formatCost(currentStep.edgeWeight ?? 0)}, g = ${formatCost(currentStep.gCost)}, h = ${h}, f = ${f}) · A*`
        } else {
          discoverMsg = currentStep.fromNodeId === null
            ? `${currentStep.nodeLabel} queued — start node, cost 0 · ${label}`
            : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (edge +${formatCost(currentStep.edgeWeight ?? 0)}, total cost ${formatCost(currentStep.gCost)}) · ${label}`
        }
        const statusMsg = currentStep.eventType === 'settle' || currentStep.eventType === 'assumed'
          ? (currentStep.settleReason ?? `${currentStep.nodeLabel} confirmed at cost ${formatCost(currentStep.gCost)} · ${label}`)
          : discoverMsg

        setWpSettledNodeIds([...settledSet])
        setWpTentativeNodeIds([...tentativeMap.keys()])
        setWpAssumedNodeIds([...assumedSet])
        setWpCurrentNodeId(currentStep.eventType === 'settle' || currentStep.eventType === 'assumed' ? null : currentStep.nodeId)
        setWpCurrentEdgeId(currentEdgeId)
        setWpCostByNodeId(costByNodeId)
        setWpVisitedEdgeIds([...visitedEdgeSet])
        setWpVisitedEdgeFwdIds([...visitedEdgeFwdSet])
        setWpVisitedEdgeRevIds([...visitedEdgeRevSet])
        setWpStartNodeId(r.startNodeId)
        setWpGoalNodeId(r.goalNodeId)
        setWpPathNodeIds([])
        setWpPathEdgeIds([])
        setWpQueueSize(currentStep.queueSizeAfter)
        setStatusText(statusMsg)
      }
    },
    [edges],
  )

  const applyStepRef = useRef(applyStep)
  useLayoutEffect(() => {
    applyStepRef.current = applyStep
  })

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

  const finalizeRef = useRef<(r: AnyResult) => void>(() => {})

  const activeStepCount = result === null ? 0 : result.steps.length

  const playback = useStepPlayback({
    stepCount: activeStepCount,
    minDelay: PLAYBACK_MIN_DELAY_MS,
    maxDelay: PLAYBACK_MAX_DELAY_MS,
    defaultDelay: PLAYBACK_DEFAULT_DELAY_MS,
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
    finalizeRef.current = (r: AnyResult) => {
      playback.stopPlayback()
      setWpCurrentNodeId(null)
      setWpCurrentEdgeId(null)
      setWpQueueSize(null)
      const pathEdgeIds = buildPathEdgeIds(r.pathNodeIds)
      setWpPathNodeIds(r.pathFound ? r.pathNodeIds : [])
      setWpPathEdgeIds(r.pathFound ? pathEdgeIds : [])
      if (r.kind === 'bfsdfs') {
        setStatusText(buildWPCompletionStatus(r, nodes, algorithmRef.current as 'bfs' | 'dfs'))
      } else {
        setStatusText(buildPriorityCompletionStatus(r, nodes, algorithmRef.current))
      }
    }
  }, [playback, nodes, buildPathEdgeIds])

  const clearVisuals = useCallback(() => {
    setWpSettledNodeIds([])
    setWpTentativeNodeIds([])
    setWpAssumedNodeIds([])
    setWpCurrentNodeId(null)
    setWpCurrentEdgeId(null)
    setWpStartNodeId(null)
    setWpGoalNodeId(null)
    setWpCostByNodeId(new Map())
    setWpPathNodeIds([])
    setWpPathEdgeIds([])
    setWpVisitedEdgeIds([])
    setWpVisitedEdgeFwdIds([])
    setWpVisitedEdgeRevIds([])
    setWpQueueSize(null)
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
    (algorithm: WeightedAlgorithm) => {
      if (playback.isPlaying) return
      playback.stopPlayback()
      resetWPVisualization()
      algorithmRef.current = algorithm
      setWpAlgorithm(algorithm)

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

      let r: AnyResult
      if (algorithm === 'bfs' || algorithm === 'dfs') {
        r = runWeightedPathfinding(nodes, edges, startNode.id, goalNode.id, algorithm)
      } else if (algorithm === 'dijkstra') {
        r = runDijkstra(nodes, edges, startNode.id, goalNode.id)
      } else if (algorithm === 'astar') {
        r = runAStar(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
      } else {
        r = runGreedy(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
      }

      if (r.steps.length === 0) {
        setStatusText('Pathfinder could not run on this graph.')
        return
      }

      const label = algorithmLabel(algorithm)
      setResult(r)
      setPlaybackSession((s) => s + 1)
      setIsRunning(true)
      setWpStartNodeId(startNode.id)
      setWpGoalNodeId(goalNode.id)
      setStatusText(`Pathfinder (${label}) ready. Press Play or step through manually.`)
    },
    [playback, resetWPVisualization, nodes, edges, startNodeLabel, goalNodeLabel, pixelsPerUnit],
  )

  const handleStartNodeLabelChange = useCallback((value: string) => {
    setStartNodeLabel(sanitizeNodeLabelInput(value))
  }, [])

  const handleGoalNodeLabelChange = useCallback((value: string) => {
    setGoalNodeLabel(sanitizeNodeLabelInput(value))
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
    const replayFromEnd = playback.isPlaybackComplete
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

  const wpOutput: WPOutput = result !== null
    ? {
        pathFound: result.pathFound,
        pathCost: result.pathCost,
        pathNodeLabels: result.kind === 'bfsdfs'
          ? formatWPPathNodeLabels(result, nodes)
          : formatPriorityPathNodeLabels(result, nodes),
        operationCount: result.operationCount,
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
    wpAssumedNodeIds,
    wpCurrentNodeId,
    wpStartNodeId,
    wpGoalNodeId,
    wpCostByNodeId,
    wpPathNodeIds,
    wpPathEdgeIds,
    wpCurrentEdgeId,
    wpVisitedEdgeIds,
    wpVisitedEdgeFwdIds,
    wpVisitedEdgeRevIds,

    isPlaying: playback.isPlaying,
    playbackSpeed: playback.playbackSpeed,
    stepIndex: playback.stepIndex,
    canStepBackward: result !== null && playback.canStepBackward,
    canStepForward: result !== null && playback.canStepForward,
    canTogglePlay: result !== null && playback.canTogglePlay,
    isPlaybackComplete: result !== null && playback.isPlaybackComplete,

    wpOutput,
    canRunWP,
    wpActiveStepTotal: activeStepCount,
    wpQueueSize,
    wpNodesSettled: wpSettledNodeIds.length,
    wpPathGuaranteed: result === null || result.kind === 'bfsdfs' || wpAlgorithm === 'dijkstra' || (wpAlgorithm === 'astar' && result.kind === 'priority' && result.heuristicAdmissible),

    runWPFromSidebar,
    resetWPVisualization,
    handleStartNodeLabelChange,
    handleGoalNodeLabelChange,
    stepWPForward,
    stepWPBackward,
    playWP,
    pauseWP,
    handleWPPlaybackSpeedChange: playback.setPlaybackSpeed,
    wpCurrentPhase: (() => {
      if (!isRunning || !result) return null as WPPhase | null
      if (playback.stepIndex < 0) return 'ready' as WPPhase
      if (playback.isPlaybackComplete) return (result.pathFound ? 'done-found' : 'done-empty') as WPPhase
      if (result.kind === 'bfsdfs') {
        const activeSteps = result.steps
        const si = Math.min(playback.stepIndex, activeSteps.length - 1)
        const step = activeSteps[si]
        if (step.eventType === 'settle') return 'step-settle' as WPPhase
        if (step.fromNodeId === null) return 'step-start' as WPPhase
        return 'step-discover' as WPPhase
      }
      const si = Math.min(playback.stepIndex, result.steps.length - 1)
      const step = result.steps[si]
      if (step.eventType === 'settle' || step.eventType === 'assumed') return 'step-settle' as WPPhase
      if (step.fromNodeId === null) return 'step-start' as WPPhase
      return 'step-discover' as WPPhase
    })(),
    wpVarsRows: (() => {
      if (!result) return null
      const nodeLabels = new Map(nodes.map(n => [n.id, n.label]))
      const isDone = playback.isPlaybackComplete

      if (playback.stepIndex < 0) {
        const startLabel = nodeLabels.get(result.startNodeId) ?? '?'
        if (result.kind === 'bfsdfs') {
          const frontierLabel = wpAlgorithm === 'dfs' ? 'stack' : 'queue'
          return [[`u = —`], [`${frontierLabel} = [${startLabel}]`], [`cost = {${startLabel}: 0}`]]
        }
        if (wpAlgorithm === 'greedy') return [[`u = —`], [`pq = [${startLabel}]`], [`visited = []`]]
        const costLabel = wpAlgorithm === 'astar' ? 'g' : 'dist'
        return [[`u = —`], [`pq = [${startLabel}]`], [`${costLabel} = {${startLabel}: 0}`]]
      }

      if (result.kind === 'bfsdfs') {
        const activeSteps = result.steps
        const si = Math.min(playback.stepIndex, activeSteps.length - 1)
        const step = activeSteps[si]
        const settledSet = new Set<string>()
        const bestKnownCost = new Map<string, number>()
        for (const s of activeSteps.slice(0, si + 1)) {
          if (s.eventType === 'settle') {
            settledSet.add(s.nodeId)
          } else {
            const ex = bestKnownCost.get(s.nodeId)
            if (ex === undefined || s.costToNode < ex) bestKnownCost.set(s.nodeId, s.costToNode)
          }
        }
        const frontierLabel = wpAlgorithm === 'dfs' ? 'stack' : 'queue'
        const queueLabels = [...bestKnownCost.keys()]
          .filter(id => !settledSet.has(id))
          .map(id => nodeLabels.get(id) ?? id)
        const costEntries = [...bestKnownCost.entries()]
          .map(([id, c]) => `${nodeLabels.get(id) ?? id}: ${c}`)
        if (isDone) {
          return [
            [`u = —`, `c = —`, `newCost = —`],
            [`${frontierLabel} = []`],
            [`cost = {${costEntries.join(', ')}}`],
          ]
        }
        if (step.eventType === 'settle') {
          return [
            [`u = ${step.nodeLabel}`, `c = —`, `newCost = —`],
            [`${frontierLabel} = [${queueLabels.join(', ')}]`],
            [`cost = {${costEntries.join(', ')}}`],
          ]
        }
        const uLabel = step.fromNodeId === null
          ? step.nodeLabel
          : (nodeLabels.get(step.fromNodeId) ?? '?')
        const cVal = step.fromNodeId === null ? 0 : (bestKnownCost.get(step.fromNodeId) ?? 0)
        return [
          [`u = ${uLabel}`, `c = ${cVal}`, `newCost = ${step.costToNode}`],
          [`${frontierLabel} = [${queueLabels.join(', ')}]`],
          [`cost = {${costEntries.join(', ')}}`],
        ]
      }

      // Priority algorithms (Dijkstra, A*, Greedy)
      const si = Math.min(playback.stepIndex, result.steps.length - 1)
      const step = result.steps[si]
      const algo = wpAlgorithm
      const settledSet = new Set<string>()
      const bestKnownCost = new Map<string, number>()
      for (const s of result.steps.slice(0, si + 1)) {
        if (s.eventType === 'settle' || s.eventType === 'assumed') {
          settledSet.add(s.nodeId)
          bestKnownCost.set(s.nodeId, s.gCost)
        } else {
          const ex = bestKnownCost.get(s.nodeId)
          if (ex === undefined || s.gCost < ex) bestKnownCost.set(s.nodeId, s.gCost)
        }
      }
      const queueLabels = [...bestKnownCost.keys()]
        .filter(id => !settledSet.has(id))
        .map(id => nodeLabels.get(id) ?? id)
      const isSettle = step.eventType === 'settle' || step.eventType === 'assumed'
      const uLabel = isSettle || step.fromNodeId === null
        ? step.nodeLabel
        : (nodeLabels.get(step.fromNodeId) ?? '?')

      if (algo === 'greedy') {
        const visitedLabels = [...settledSet].map(id => nodeLabels.get(id) ?? id)
        if (isDone) {
          return [
            [`u = —`, `h = —`],
            [`pq = []`],
            [`visited = [${visitedLabels.join(', ')}]`],
          ]
        }
        return [
          [`u = ${uLabel}`, `h = ${formatCost(step.hCost)}`],
          [`pq = [${queueLabels.join(', ')}]`],
          [`visited = [${visitedLabels.join(', ')}]`],
        ]
      }

      const costEntries = [...bestKnownCost.entries()]
        .map(([id, c]) => `${nodeLabels.get(id) ?? id}: ${formatCost(c)}`)

      if (algo === 'astar') {
        const row1: string[] = isDone
          ? [`u = —`, `g = —`, `h = —`, `f = —`]
          : [`u = ${uLabel}`, `g = ${formatCost(step.gCost)}`, `h = ${formatCost(step.hCost)}`, `f = ${formatCost(step.priority)}`]
        return [
          row1,
          [`pq = [${isDone ? '' : queueLabels.join(', ')}]`],
          [`g = {${costEntries.join(', ')}}`],
        ]
      }

      // Dijkstra
      let dVal: string, newDistVal: string
      if (isDone) {
        dVal = '—'; newDistVal = '—'
      } else if (isSettle || step.fromNodeId === null) {
        dVal = formatCost(step.gCost); newDistVal = '—'
      } else {
        dVal = formatCost(bestKnownCost.get(step.fromNodeId) ?? 0); newDistVal = formatCost(step.gCost)
      }
      return [
        isDone
          ? [`u = —`, `d = —`, `newDist = —`]
          : [`u = ${uLabel}`, `d = ${dVal}`, `newDist = ${newDistVal}`],
        [`pq = [${isDone ? '' : queueLabels.join(', ')}]`],
        [`dist = {${costEntries.join(', ')}}`],
      ]
    })(),
  }
}
