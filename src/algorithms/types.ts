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

export type ConnectedComponentsStrategy = 'bfs' | 'dfs'
