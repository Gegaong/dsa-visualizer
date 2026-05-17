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

export type ShortestPathStep = BfsStep

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
