import type { GraphNode } from '../types'

import type { TraversalStrategy, WeightedPathResult } from './algorithmstypes'

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

export function formatWPPathNodeLabels(result: WeightedPathResult, nodes: GraphNode[]): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return result.pathNodeIds.map((id) => nodeById.get(id)?.label ?? '?')
}
