import type { GraphNode } from '../types'

import type { PriorityPathResult, TraversalStrategy, WeightedAlgorithm, WeightedPathResult } from './algorithmstypes'

// Builds the completion status line shown after a BFS/DFS weighted pathfinding session ends.
export function buildWPCompletionStatus(
  result: WeightedPathResult,
  nodes: GraphNode[],
  strategy: TraversalStrategy,
): string {
  const label = strategy === 'bfs' ? 'BFS' : 'DFS'
  if (!result.pathFound) {
    return `${label}: No path from start to goal.`
  }
  const pathLabels = formatWPPathNodeLabels(result, nodes).join(' → ')
  const edgeCount = result.pathNodeIds.length - 1
  const costStr = result.pathCost !== null ? ` (cost ${result.pathCost})` : ''
  return `Path found${costStr}: ${pathLabels} — ${edgeCount} edge${edgeCount === 1 ? '' : 's'}`
}

// Returns the ordered node labels along the BFS/DFS path, falling back to '?' for missing ids.
export function formatWPPathNodeLabels(result: WeightedPathResult, nodes: GraphNode[]): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return result.pathNodeIds.map((id) => nodeById.get(id)?.label ?? '?')
}

// Builds the completion status line shown after a priority-queue pathfinding session ends.
export function buildPriorityCompletionStatus(
  result: PriorityPathResult,
  nodes: GraphNode[],
  algorithm: WeightedAlgorithm,
): string {
  const label = algorithm === 'dijkstra' ? 'Dijkstra' : algorithm === 'astar' ? 'A*' : 'Greedy'
  if (!result.pathFound) {
    return `${label}: No path from start to goal.`
  }
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const pathLabels = result.pathNodeIds.map((id) => nodeById.get(id)?.label ?? '?').join(' → ')
  const edgeCount = result.pathNodeIds.length - 1
  const costStr = result.pathCost !== null ? ` (cost ${result.pathCost})` : ''
  return `${label}: Path found${costStr}: ${pathLabels} — ${edgeCount} edge${edgeCount === 1 ? '' : 's'}`
}

// Returns the ordered node labels along the priority-algorithm path, falling back to '?' for missing ids.
export function formatPriorityPathNodeLabels(result: PriorityPathResult, nodes: GraphNode[]): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return result.pathNodeIds.map((id) => nodeById.get(id)?.label ?? '?')
}
