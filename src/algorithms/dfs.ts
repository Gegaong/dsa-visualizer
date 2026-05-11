import type { BfsInput, BfsResult } from './types'
import { runDirectedGoalTraversal } from './directedGoalTraversal'

// Depth-first variant of directed goal traversal (Traversal tab entry point).
export const runDfs = (input: BfsInput): BfsResult => runDirectedGoalTraversal(input, 'dfs')
