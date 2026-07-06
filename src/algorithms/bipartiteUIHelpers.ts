import type { GraphNode } from '../types'

import type { BipartiteResult } from './algorithmTypes'

import { sortIdsByLabel } from './sortIdsByLabel'

// Returns sorted labels for a list of node ids.
function labelsFor(ids: string[], nodeById: Map<string, GraphNode>): string[] {
  return sortIdsByLabel(ids, nodeById).map((id) => nodeById.get(id)?.label ?? id)
}

// Full status line shown after a bipartite run completes.
export function buildBipartiteCompletionStatus(
  result: BipartiteResult,
  nodes: GraphNode[],
): string {
  if (result.steps.length === 0) return 'Done. No nodes in the graph.'
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  if (!result.isBipartite) return 'Done. Graph is not bipartite (odd-length cycle found).'
  const a = labelsFor(result.groupANodeIds, nodeById).join(', ')
  const b = labelsFor(result.groupBNodeIds, nodeById).join(', ')
  return `Done. Graph is bipartite. Group A: ${a} · Group B: ${b}`
}

// Formats group labels for sidebar output display; returns null when there are no nodes.
export function formatBipartiteGroupLabels(
  nodeIds: string[],
  nodes: GraphNode[],
): string | null {
  if (nodeIds.length === 0) return null
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return labelsFor(nodeIds, nodeById).join(', ')
}
