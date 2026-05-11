import type { BfsInput, BfsResult } from './types'
import { runDirectedGoalTraversal } from './directedGoalTraversal'

// Breadth-first variant of directed goal traversal (Traversal tab entry point).
export const runBfs = (input: BfsInput): BfsResult => runDirectedGoalTraversal(input, 'bfs')
