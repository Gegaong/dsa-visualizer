import type { GoalType } from '../types'

// Shared by graph BFS/DFS search AND binary tree traversal search — both model "find a node by
// this goal" the same way, so the goal/step/result shapes live here instead of inside the
// graph-only algorithmTypes.ts.
export type BfsGoal =
  | { type: 'target-node'; targetNodeLabel: string }
  | { type: 'target-value'; targetValue: number }
  | { type: 'max-value' }
  | { type: 'min-value' }

export type BfsStep = {
  nodeId: string
  nodeLabel: string
  order: number
  fromNodeId: string | null
  runningBest?: number | null
  frontierNodeIds: string[]
}

export type BfsResult = {
  steps: BfsStep[]
  foundNodeId: string | null
  foundNodeLabel: string | null
  foundNodeIds: string[]
  foundValue: number | null
  goalType: GoalType
}
