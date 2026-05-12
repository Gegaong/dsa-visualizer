import type { GraphNode } from '../types'
import type { CycleDetectionResult } from './algorithmstypes'

// Visible labels of the detected cycle's nodes, in cycle order (empty when no cycle).
export function formatCycleNodeLabels(
  result: CycleDetectionResult,
  nodes: GraphNode[],
): string[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return result.cycleNodeIds.map((id) => nodeById.get(id)?.label ?? id)
}

// Status line shown once cycle detection playback finishes.
export const buildCycleDetectionCompletionStatus = (
  result: CycleDetectionResult,
  nodes: GraphNode[],
): string => {
  if (!result.hasCycle) {
    return 'Done. No directed cycle found.'
  }
  const labels = formatCycleNodeLabels(result, nodes)
  return `Done. Cycle detected: ${labels.join(' → ')} → ${labels[0]}.`
}
