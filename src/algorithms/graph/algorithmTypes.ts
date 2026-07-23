import type { GraphEdge, GraphNode } from '../../types'
import type { BfsGoal, BfsStep } from '../sharedSearchTypes'

export type BfsInput = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNodeLabel: string
  goal: BfsGoal
}

export type ConnectedComponentsStep = BfsStep & {
  componentRootNodeId: string
}

export type ConnectedComponentsResult = {
  steps: ConnectedComponentsStep[]
  componentCount: number
  largestComponentSize: number
  components: string[][]
  operationCount: number
}

export type TraversalStrategy = 'bfs' | 'dfs'

export type CycleDetectionStep = BfsStep

export type CycleDetectionResult = {
  steps: CycleDetectionStep[]
  hasCycle: boolean
  // Node ids forming one detected directed cycle, in traversal order (consecutive ids,
  // and the last → first, each have an edge). Empty when no cycle exists.
  cycleNodeIds: string[]
  operationCount: number
}

export type ShortestPathStep = BfsStep & {
  dfsBestPathLength?: number | null
  // BFS only: node ids first discovered (parent set + enqueued) while processing this step.
  // Lets the sidebar rebuild the parent map exactly as `parent[nb] ← u` fills it.
  enqueuedNodeIds?: string[]
}

export type ShortestPathResult = {
  steps: ShortestPathStep[]
  // Ordered node ids from start to goal; empty when goal is unreachable.
  pathNodeIds: string[]
  startNodeId: string
  goalNodeId: string
  pathFound: boolean
  operationCount: number
}

export type BipartiteStep = BfsStep & {
  // 0 = group A (yellow), 1 = group B (blue)
  color: 0 | 1
  // True only for the terminal step reporting a same-color clash (odd cycle); not a real coloring.
  // nodeId = the already-colored neighbor (nb), fromNodeId = the node being processed (u).
  conflict?: boolean
}

export type BipartiteResult = {
  steps: BipartiteStep[]
  isBipartite: boolean
  groupANodeIds: string[]
  groupBNodeIds: string[]
  operationCount: number
}

export type WeightedPathStep = {
  nodeId: string
  nodeLabel: string
  order: number
  fromNodeId: string | null
  costToNode: number
  // 'discover' = node added to frontier (yellow). 'settle' = node confirmed optimal (green).
  eventType: 'discover' | 'settle'
  // Human-readable reason shown in the sidebar when this node turned green. Only on settle steps.
  settleReason?: string
}

export type WeightedPathResult = {
  kind: 'bfsdfs'
  // Discover + settle steps interleaved in playback order.
  steps: WeightedPathStep[]
  pathNodeIds: string[]
  startNodeId: string
  goalNodeId: string
  pathFound: boolean
  pathCost: number | null
  operationCount: number
}

// 'bfs' / 'dfs' are the unweighted-style path searches; 'dijkstra' / 'astar' / 'greedy' use a priority queue.
export type WeightedAlgorithm = 'bfs' | 'dfs' | 'dijkstra' | 'astar' | 'greedy'

export type PriorityPathStep = {
  nodeId: string
  nodeLabel: string
  order: number
  fromNodeId: string | null
  fromNodeLabel: string | null
  edgeWeight: number | null
  gCost: number        // actual cost from start
  hCost: number        // heuristic value (0 for Dijkstra)
  priority: number     // value used to order in the queue (g for Dijkstra, g+h for A*, h for Greedy)
  // 'discover' = queued (yellow). 'settle' = confirmed optimal (green). 'assumed' = committed but unproven (yellow-green).
  eventType: 'discover' | 'settle' | 'assumed'
  queueSizeAfter: number
  settleReason?: string
}

export type PriorityPathResult = {
  kind: 'priority'
  steps: PriorityPathStep[]
  pathNodeIds: string[]
  startNodeId: string
  goalNodeId: string
  pathFound: boolean
  pathCost: number | null
  heuristicAdmissible: boolean
  operationCount: number
}
