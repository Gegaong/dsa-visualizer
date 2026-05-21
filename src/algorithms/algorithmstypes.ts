import type { GoalType, GraphEdge, GraphNode } from '../types'

export type BfsGoal =
  | { type: 'target-node'; targetNodeLabel: string }
  | { type: 'target-value'; targetValue: number }
  | { type: 'max-value' }
  | { type: 'min-value' }

export type BfsInput = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  startNodeLabel: string
  goal: BfsGoal
}

export type BfsStep = {
  nodeId: string
  nodeLabel: string
  order: number
  fromNodeId: string | null
  runningBest?: number | null
}

export type BfsResult = {
  steps: BfsStep[]
  foundNodeId: string | null
  foundNodeLabel: string | null
  foundNodeIds: string[]
  foundValue: number | null
  goalType: GoalType
}

export type ConnectedComponentsStep = BfsStep & {
  componentRootNodeId: string
}

export type ConnectedComponentsResult = {
  steps: ConnectedComponentsStep[]
  componentCount: number
  largestComponentSize: number
  components: string[][]
}

export type TraversalStrategy = 'bfs' | 'dfs'

export type CycleDetectionStep = BfsStep

export type CycleDetectionResult = {
  steps: CycleDetectionStep[]
  hasCycle: boolean
  // Node ids forming one detected directed cycle, in traversal order (consecutive ids,
  // and the last → first, each have an edge). Empty when no cycle exists.
  cycleNodeIds: string[]
}

export type ShortestPathStep = BfsStep & {
  dfsBestPathLength?: number | null
}

export type ShortestPathResult = {
  steps: ShortestPathStep[]
  // Ordered node ids from start to goal; empty when goal is unreachable.
  pathNodeIds: string[]
  startNodeId: string
  goalNodeId: string
  pathFound: boolean
}

export type BipartiteStep = BfsStep & {
  // 0 = group A (yellow), 1 = group B (blue)
  color: 0 | 1
}

export type BipartiteResult = {
  steps: BipartiteStep[]
  isBipartite: boolean
  groupANodeIds: string[]
  groupBNodeIds: string[]
}

export type WeightedPathStep = {
  nodeId: string
  nodeLabel: string
  order: number
  fromNodeId: string | null
  costToNode: number
  // Min cost among all frontier paths after this step's expansion finished.
  // applyStep uses this to confirm (green) nodes without emitting separate settle steps.
  minPendingCostAfter: number
  // 'discover' = node added to frontier (yellow). 'settle' = node confirmed optimal (green).
  // Settle steps only appear in detailedSteps; steps contains discovers only.
  eventType: 'discover' | 'settle'
  // Human-readable explanation of why this node turned green. Only on settle steps.
  settleReason?: string
}

export type WeightedPathResult = {
  // Discover-only step sequence — settlement is inferred from minPendingCostAfter.
  steps: WeightedPathStep[]
  // Discover + explicit settle steps interleaved — used when detail mode is on.
  detailedSteps: WeightedPathStep[]
  pathNodeIds: string[]
  startNodeId: string
  goalNodeId: string
  pathFound: boolean
  pathCost: number | null
}
