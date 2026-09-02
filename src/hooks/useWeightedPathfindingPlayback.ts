import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

import type { GraphEdge, GraphNode } from '../types'

import type {
  PriorityPathResult,
  PriorityPathStep,
  WeightedAlgorithm,
  WeightedPathResult,
  WeightedPathStep,
  WPPlaybackMode,
} from '../algorithms/graph/algorithmTypes'

import type { WPOutput } from '../components/sidebar/sidebarTypes'

import {
  runWeightedPathfinding,
  runWeightedPathfindingCode,
  getDirectedEdgeId,
  getDirectedEdgeInfo,
} from '../algorithms/graph/weightedPathfinding'

import {
  runDijkstra,
  runDijkstraCode,
  runAStar,
  runAStarCode,
  runGreedy,
  runGreedyCode,
} from '../algorithms/graph/priorityPathfinding'

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

import { formatCost, sanitizeNodeLabelInput } from '../utils/format'

import { useStepPlayback } from './useStepPlayback'

export type WPPhase = 'ready' | 'step-start' | 'step-discover' | 'step-settle' | 'done-found' | 'done-empty'

const IDLE_STATUS = 'Enter start and goal node labels, then run the pathfinder.'

type AnyResult = WeightedPathResult | PriorityPathResult

export type WPPlaybackHandle = {
  playbackMode: WPPlaybackMode
  setPlaybackMode: (mode: WPPlaybackMode) => void
  currentStep: WeightedPathStep | PriorityPathStep | null
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
  const [playbackMode, setPlaybackMode] = useState<WPPlaybackMode>('visual')
  const [currentStep, setCurrentStep] = useState<WeightedPathStep | PriorityPathStep | null>(null)
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
          setCurrentStep(null)
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
        setCurrentStep(currentStep)
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

        let currentEdgeId: string | null
        let currentNodeId: string | null

        if (currentStep.codeLine !== undefined) {
          if (currentStep.eventType === 'settle') {
            currentNodeId = null
            currentEdgeId = null
          } else if (currentStep.codeLine >= 7 && currentStep.codeLine <= 9 && currentStep.fromNodeId !== null) {
            currentEdgeId = getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
            currentNodeId = currentStep.nodeId
          } else if (currentStep.codeLine >= 3 && currentStep.codeLine <= 6) {
            currentNodeId = currentStep.nodeId
            currentEdgeId = null
          } else {
            currentNodeId = null
            currentEdgeId = null
          }
        } else {
          currentNodeId = currentStep.eventType === 'settle' ? null : currentStep.nodeId
          currentEdgeId = currentStep.fromNodeId !== null
            ? getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
            : null
        }

        let statusMsg: string
        if (currentStep.eventType === 'settle') {
          statusMsg = currentStep.settleReason ?? `${currentStep.nodeLabel} confirmed at cost ${formatCost(currentStep.costToNode)}`
        } else if (currentStep.codeLine !== undefined) {
          const frontierWord = algorithmRef.current === 'dfs' ? 'stack' : 'queue'
          switch (currentStep.codeLine) {
            case 0:
              statusMsg = `Weighted${label}(graph, ${startNodeLabel}, ${goalNodeLabel}) · Start pathfinding`
              break
            case 1:
              statusMsg = `Initializing costs and ${frontierWord} with start node ${startNodeLabel}`
              break
            case 2:
              statusMsg = `Checking if ${frontierWord} is empty...`
              break
            case 3:
              statusMsg = `Dequeued path ending at ${currentStep.uLabel} (cost: ${formatCost(currentStep.cVal ?? 0)})`
              break
            case 4:
              statusMsg = `Checking prune conditions for ${currentStep.uLabel}...`
              break
            case 5:
              statusMsg = `Checking if ${currentStep.uLabel} is the goal node (${goalNodeLabel})`
              break
            case 6:
              statusMsg = `Iterating over neighbors of ${currentStep.uLabel}`
              break
            case 7:
              statusMsg = `Computing cost to neighbor ${currentStep.nbLabel}: ${formatCost(currentStep.cVal ?? 0)} + weight = ${formatCost(currentStep.newCostVal ?? 0)}`
              break
            case 8:
              statusMsg = `Checking if neighbor ${currentStep.nbLabel} is unvisited on path and beats cost`
              break
            case 9:
              statusMsg = `Updating cost[${currentStep.nbLabel}] = ${formatCost(currentStep.newCostVal ?? 0)} and pushing to ${frontierWord}`
              break
            case 10:
              statusMsg = `Search finished. ${r.pathFound ? `Path found with cost ${r.pathCost}` : 'No path exists'}`
              break
            default:
              statusMsg = `Executing line ${currentStep.codeLine + 1} · ${label}`
          }
        } else {
          statusMsg = `Visiting ${currentStep.nodeLabel} · current path cost ${formatCost(currentStep.costToNode)} (step ${bound + 1}/${activeSteps.length}) · ${label}`
        }

        setWpSettledNodeIds([...settledSet])
        setWpTentativeNodeIds([...tentativeMap.keys()])
        setWpCurrentNodeId(currentNodeId)
        setWpCurrentEdgeId(currentEdgeId)
        setWpCostByNodeId(costByNodeId)
        setWpVisitedEdgeIds([...visitedEdgeSet])
        setWpVisitedEdgeFwdIds([...visitedEdgeFwdSet])
        setWpVisitedEdgeRevIds([...visitedEdgeRevSet])
        setWpStartNodeId(r.startNodeId)
        setWpGoalNodeId(r.goalNodeId)
        setWpPathNodeIds([])
        setWpPathEdgeIds([])
        setWpQueueSize(currentStep.frontierLabels?.length ?? null)
        setStatusText(statusMsg)
      } else {
        if (index < 0) {
          setCurrentStep(null)
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
        setCurrentStep(currentStep)
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

        let currentEdgeId: string | null
        let currentNodeId: string | null

        if (currentStep.codeLine !== undefined) {
          if (currentStep.eventType === 'settle' || currentStep.eventType === 'assumed') {
            currentNodeId = currentStep.nodeId
            currentEdgeId = null
          } else if (currentStep.codeLine >= 5 && currentStep.codeLine <= 8 && currentStep.fromNodeId !== null) {
            currentEdgeId = getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
            currentNodeId = currentStep.nodeId
          } else if (currentStep.codeLine === 3 || currentStep.codeLine === 4) {
            currentNodeId = currentStep.nodeId
            currentEdgeId = null
          } else {
            currentNodeId = null
            currentEdgeId = null
          }
        } else {
          currentNodeId = currentStep.eventType === 'settle' || currentStep.eventType === 'assumed' ? null : currentStep.nodeId
          currentEdgeId = currentStep.eventType === 'discover' && currentStep.fromNodeId !== null
            ? getDirectedEdgeId(edges, currentStep.fromNodeId, currentStep.nodeId)
            : null
        }

        const algo = algorithmRef.current
        let statusMsg: string

        if (currentStep.eventType === 'settle' || currentStep.eventType === 'assumed') {
          statusMsg = currentStep.settleReason ?? `${currentStep.nodeLabel} confirmed at cost ${formatCost(currentStep.gCost)} · ${label}`
        } else if (currentStep.codeLine !== undefined) {
          if (algo === 'dijkstra') {
            switch (currentStep.codeLine) {
              case 0:
                statusMsg = `Dijkstra(graph, ${startNodeLabel}, ${goalNodeLabel}) · Start shortest path search`
                break
              case 1:
                statusMsg = `Initializing dist[v] = ∞, dist[${startNodeLabel}] = 0, pq = [(0, ${startNodeLabel})]`
                break
              case 2:
                statusMsg = `Checking if priority queue is empty...`
                break
              case 3:
                statusMsg = `Popped node ${currentStep.uLabel} (dist: ${formatCost(currentStep.dVal ?? 0)})`
                break
              case 4:
                statusMsg = `Settled ${currentStep.uLabel} (dist: ${formatCost(currentStep.dVal ?? 0)})`
                break
              case 5:
                statusMsg = `Iterating over neighbors of ${currentStep.uLabel}`
                break
              case 6:
                statusMsg = `Computing newDist to ${currentStep.nbLabel}: dist[${currentStep.uLabel}] (${formatCost(currentStep.dVal ?? 0)}) + weight = ${formatCost(currentStep.newDistVal ?? 0)}`
                break
              case 7:
                statusMsg = `Checking if newDist (${formatCost(currentStep.newDistVal ?? 0)}) < dist[${currentStep.nbLabel}]`
                break
              case 8:
                statusMsg = `Updating dist[${currentStep.nbLabel}] = ${formatCost(currentStep.newDistVal ?? 0)} and pushing to priority queue`
                break
              case 9:
                statusMsg = `Search complete. ${r.pathFound ? `Path found with cost ${r.pathCost}` : 'No path exists'}`
                break
              default:
                statusMsg = `Executing line ${currentStep.codeLine + 1} · Dijkstra`
            }
          } else if (algo === 'astar') {
            switch (currentStep.codeLine) {
              case 0:
                statusMsg = `AStar(graph, ${startNodeLabel}, ${goalNodeLabel}) · Start A* search`
                break
              case 1:
                statusMsg = `Initializing g[v] = ∞, g[${startNodeLabel}] = 0, pq = [(h(${startNodeLabel}), ${startNodeLabel})]`
                break
              case 2:
                statusMsg = `Checking if priority queue is empty...`
                break
              case 3:
                statusMsg = `Popped node ${currentStep.uLabel} with priority f = ${formatCost(currentStep.fVal ?? 0)} (g = ${formatCost(currentStep.gVal ?? 0)}, h = ${formatCost(currentStep.hVal ?? 0)})`
                break
              case 4:
                statusMsg = `Settling ${currentStep.uLabel} at cost g = ${formatCost(currentStep.gVal ?? 0)}`
                break
              case 5:
                statusMsg = `Iterating over neighbors of ${currentStep.uLabel}`
                break
              case 6:
                statusMsg = `Computing newG to ${currentStep.nbLabel}: g[${currentStep.uLabel}] (${formatCost(currentStep.gVal ?? 0)}) + weight = ${formatCost(currentStep.newGVal ?? 0)}`
                break
              case 7:
                statusMsg = `Checking if newG (${formatCost(currentStep.newGVal ?? 0)}) < g[${currentStep.nbLabel}]`
                break
              case 8:
                statusMsg = `Updating g[${currentStep.nbLabel}] = ${formatCost(currentStep.newGVal ?? 0)} and pushing to priority queue`
                break
              case 9:
                statusMsg = `Search complete. ${r.pathFound ? `Path found with cost ${r.pathCost}` : 'No path exists'}`
                break
              default:
                statusMsg = `Executing line ${currentStep.codeLine + 1} · A*`
            }
          } else {
            // Greedy
            switch (currentStep.codeLine) {
              case 0:
                statusMsg = `Greedy(graph, ${startNodeLabel}, ${goalNodeLabel}) · Start Greedy Best-First search`
                break
              case 1:
                statusMsg = `Initializing pq = [(h(${startNodeLabel}), ${startNodeLabel})], visited = {}`
                break
              case 2:
                statusMsg = `Checking if priority queue is empty...`
                break
              case 3:
                statusMsg = `Popped node ${currentStep.uLabel} with heuristic h = ${formatCost(currentStep.hVal ?? 0)}`
                break
              case 4:
                statusMsg = `Marking ${currentStep.uLabel} visited (h = ${formatCost(currentStep.hVal ?? 0)})`
                break
              case 5:
                statusMsg = `Iterating over neighbors of ${currentStep.uLabel}`
                break
              case 6:
                statusMsg = `Checking if neighbor ${currentStep.nbLabel} not yet reached (nb ∉ prev)`
                break
              case 7:
                statusMsg = `Setting prev[${currentStep.nbLabel}] = ${currentStep.uLabel} and pushing to priority queue`
                break
              case 8:
                statusMsg = `Search complete. ${r.pathFound ? `Path found with cost ${r.pathCost}` : 'No path exists'}`
                break
              default:
                statusMsg = `Executing line ${currentStep.codeLine + 1} · Greedy`
            }
          }
        } else {
          const h = formatCost(currentStep.hCost)
          if (algo === 'greedy') {
            statusMsg = currentStep.fromNodeId === null
              ? `${currentStep.nodeLabel} queued — start node (h = ${h}) · Greedy`
              : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (h = ${h}) · Greedy`
          } else if (algo === 'astar') {
            const f = formatCost(currentStep.priority)
            statusMsg = currentStep.fromNodeId === null
              ? `${currentStep.nodeLabel} queued — start node (g = 0, h = ${h}, f = ${h}) · A*`
              : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (edge +${formatCost(currentStep.edgeWeight ?? 0)}, g = ${formatCost(currentStep.gCost)}, h = ${h}, f = ${f}) · A*`
          } else {
            statusMsg = currentStep.fromNodeId === null
              ? `${currentStep.nodeLabel} queued — start node, cost 0 · ${label}`
              : `${currentStep.nodeLabel} queued — via ${currentStep.fromNodeLabel} (edge +${formatCost(currentStep.edgeWeight ?? 0)}, total cost ${formatCost(currentStep.gCost)}) · ${label}`
          }
        }

        setWpSettledNodeIds([...settledSet])
        setWpTentativeNodeIds([...tentativeMap.keys()])
        setWpAssumedNodeIds([...assumedSet])
        setWpCurrentNodeId(currentNodeId)
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
    [edges, startNodeLabel, goalNodeLabel],
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
    setCurrentStep(null)
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
        r = playbackMode === 'code'
          ? runWeightedPathfindingCode(nodes, edges, startNode.id, goalNode.id, algorithm)
          : runWeightedPathfinding(nodes, edges, startNode.id, goalNode.id, algorithm)
      } else if (algorithm === 'dijkstra') {
        r = playbackMode === 'code'
          ? runDijkstraCode(nodes, edges, startNode.id, goalNode.id)
          : runDijkstra(nodes, edges, startNode.id, goalNode.id)
      } else if (algorithm === 'astar') {
        r = playbackMode === 'code'
          ? runAStarCode(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
          : runAStar(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
      } else {
        r = playbackMode === 'code'
          ? runGreedyCode(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
          : runGreedy(nodes, edges, startNode.id, goalNode.id, pixelsPerUnit)
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
    [playback, resetWPVisualization, nodes, edges, startNodeLabel, goalNodeLabel, pixelsPerUnit, playbackMode],
  )

  const handleStartNodeLabelChange = useCallback((value: string) => {
    if (resultRef.current || isRunning) {
      resetWPVisualization()
    }
    setStartNodeLabel(sanitizeNodeLabelInput(value))
  }, [resetWPVisualization, isRunning])

  const handleGoalNodeLabelChange = useCallback((value: string) => {
    if (resultRef.current || isRunning) {
      resetWPVisualization()
    }
    setGoalNodeLabel(sanitizeNodeLabelInput(value))
  }, [resetWPVisualization, isRunning])

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
    playbackMode,
    setPlaybackMode,
    currentStep,
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
          if (playbackMode === 'code') {
            return [
              [`u = —`, `c = —`, `nb = —`, `newCost = —`],
              [`bestCost = ∞`, `${frontierLabel} = [(${startLabel}, 0)]`],
              [`cost = {${startLabel}: 0}`],
            ]
          }
          return [[`u = —`], [`${frontierLabel} = [${startLabel}]`], [`cost = {${startLabel}: 0}`]]
        }
        if (wpAlgorithm === 'greedy') {
          if (playbackMode === 'code') {
            return [
              [`u = —`, `h = —`, `nb = —`],
              [`pq = [${startLabel}]`],
              [`visited = []`],
            ]
          }
          return [[`u = —`], [`pq = [${startLabel}]`], [`visited = []`]]
        }
        if (wpAlgorithm === 'astar') {
          if (playbackMode === 'code') {
            return [
              [`u = —`, `g = —`, `h = —`, `f = —`],
              [`nb = —`, `newG = —`, `pq = [${startLabel}]`],
              [`g = {${startLabel}: 0}`],
            ]
          }
          return [[`u = —`], [`pq = [${startLabel}]`], [`g = {${startLabel}: 0}`]]
        }
        // Dijkstra
        if (playbackMode === 'code') {
          return [
            [`u = —`, `d = —`, `nb = —`, `newDist = —`],
            [`pq = [(0, ${startLabel})]`],
            [`dist = {${startLabel}: 0}`],
          ]
        }
        return [[`u = —`], [`pq = [${startLabel}]`], [`dist = {${startLabel}: 0}`]]
      }

      if (result.kind === 'bfsdfs') {
        const activeSteps = result.steps
        const si = Math.min(playback.stepIndex, activeSteps.length - 1)
        const step = activeSteps[si]
        const frontierLabel = wpAlgorithm === 'dfs' ? 'stack' : 'queue'

        if (playbackMode === 'code' && step.codeLine !== undefined) {
          const costEntriesStr = step.costMap ? Object.entries(step.costMap).map(([lbl, c]) => `${lbl}: ${c}`).join(', ') : ''
          const frontierStr = step.frontierLabels && step.frontierLabels.length > 0
            ? (step.frontierLabels.length > 3
                ? `[${step.frontierLabels.slice(0, 3).join(', ')}, +${step.frontierLabels.length - 3}]`
                : `[${step.frontierLabels.join(', ')}]`)
            : '[]'

          if (isDone) {
            const bestCostStr = result.pathCost !== null ? String(result.pathCost) : '∞'
            return [
              [`u = —`, `c = —`, `nb = —`, `newCost = —`],
              [`bestCost = ${bestCostStr}`, `${frontierLabel} = []`],
              [`cost = {${costEntriesStr}}`],
            ]
          }

          const uStr = step.uLabel ?? '—'
          const cStr = step.cVal !== null && step.cVal !== undefined ? String(step.cVal) : '—'
          const nbStr = step.nbLabel ?? '—'
          const newCostStr = step.newCostVal !== null && step.newCostVal !== undefined ? String(step.newCostVal) : '—'
          const bestCostStr = step.bestCostVal !== null && step.bestCostVal !== undefined ? String(step.bestCostVal) : '∞'

          return [
            [`u = ${uStr}`, `c = ${cStr}`, `nb = ${nbStr}`, `newCost = ${newCostStr}`],
            [`bestCost = ${bestCostStr}`, `${frontierLabel} = ${frontierStr}`],
            [`cost = {${costEntriesStr}}`],
          ]
        }

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

      if (playbackMode === 'code' && step.codeLine !== undefined) {
        const costEntriesStr = step.costMap ? Object.entries(step.costMap).map(([lbl, c]) => `${lbl}: ${formatCost(c)}`).join(', ') : ''
        const pqStr = step.pqLabels && step.pqLabels.length > 0
          ? (step.pqLabels.length > 3
              ? `[${step.pqLabels.slice(0, 3).join(', ')}, +${step.pqLabels.length - 3}]`
              : `[${step.pqLabels.join(', ')}]`)
          : '[]'

        if (algo === 'greedy') {
          const visitedStr = step.visitedLabels && step.visitedLabels.length > 0 ? `[${step.visitedLabels.join(', ')}]` : '[]'
          if (isDone) {
            return [
              [`u = —`, `h = —`, `nb = —`],
              [`pq = []`],
              [`visited = ${visitedStr}`],
            ]
          }
          const uStr = step.uLabel ?? '—'
          const hStr = step.hVal !== null && step.hVal !== undefined ? formatCost(step.hVal) : '—'
          const nbStr = step.nbLabel ?? '—'
          return [
            [`u = ${uStr}`, `h = ${hStr}`, `nb = ${nbStr}`],
            [`pq = ${pqStr}`],
            [`visited = ${visitedStr}`],
          ]
        }

        if (algo === 'astar') {
          if (isDone) {
            return [
              [`u = —`, `g = —`, `h = —`, `f = —`],
              [`nb = —`, `newG = —`, `pq = []`],
              [`g = {${costEntriesStr}}`],
            ]
          }
          const uStr = step.uLabel ?? '—'
          const gStr = step.gVal !== null && step.gVal !== undefined ? formatCost(step.gVal) : '—'
          const hStr = step.hVal !== null && step.hVal !== undefined ? formatCost(step.hVal) : '—'
          const fStr = step.fVal !== null && step.fVal !== undefined ? formatCost(step.fVal) : '—'
          const nbStr = step.nbLabel ?? '—'
          const newGStr = step.newGVal !== null && step.newGVal !== undefined ? formatCost(step.newGVal) : '—'
          return [
            [`u = ${uStr}`, `g = ${gStr}`, `h = ${hStr}`, `f = ${fStr}`],
            [`nb = ${nbStr}`, `newG = ${newGStr}`, `pq = ${pqStr}`],
            [`g = {${costEntriesStr}}`],
          ]
        }

        // Dijkstra code mode
        if (isDone) {
          return [
            [`u = —`, `d = —`, `nb = —`, `newDist = —`],
            [`pq = []`],
            [`dist = {${costEntriesStr}}`],
          ]
        }
        const uStr = step.uLabel ?? '—'
        const dStr = step.dVal !== null && step.dVal !== undefined ? formatCost(step.dVal) : '—'
        const nbStr = step.nbLabel ?? '—'
        const newDistStr = step.newDistVal !== null && step.newDistVal !== undefined ? formatCost(step.newDistVal) : '—'
        return [
          [`u = ${uStr}`, `d = ${dStr}`, `nb = ${nbStr}`, `newDist = ${newDistStr}`],
          [`pq = ${pqStr}`],
          [`dist = {${costEntriesStr}}`],
        ]
      }

      // Visual mode priority variables
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
