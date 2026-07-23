import type { GraphNode } from '../../types'

import type { ShortestPathResult } from './algorithmTypes'

// Looks up a node's label by id; falls back to the id itself if missing.
function nodeLabel(nodes: GraphNode[], nodeId: string): string {
  return nodes.find((n) => n.id === nodeId)?.label ?? nodeId
}

// Builds the status text shown after the algorithm finishes (path found or not).
export function buildShortestPathCompletionStatus(
  result: ShortestPathResult,
  nodes: GraphNode[],
): string {
  const startLabel = nodeLabel(nodes, result.startNodeId)
  const goalLabel = nodeLabel(nodes, result.goalNodeId)
  if (!result.pathFound) {
    return `No path from ${startLabel} to ${goalLabel}.`
  }
  const pathLabels = result.pathNodeIds.map((id) => nodeLabel(nodes, id)).join(' → ')
  const edgeCount = result.pathNodeIds.length - 1
  return `Path found: ${pathLabels} — ${edgeCount} edge${edgeCount === 1 ? '' : 's'}.`
}

// Returns the ordered sequence of node labels along the shortest path.
export function formatShortestPathNodeLabels(
  result: ShortestPathResult,
  nodes: GraphNode[],
): string[] {
  return result.pathNodeIds.map((id) => nodeLabel(nodes, id))
}
