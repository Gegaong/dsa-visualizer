import type { GraphNode } from '../types'

import type { ConnectedComponentsResult } from './algorithmstypes'

import { sortIdsByLabel } from './sortIdsByLabel'

// One string per component (comma-separated labels), components joined with " | ".
export function formatWeakCCGroupsDisplay(
  result: ConnectedComponentsResult,
  nodes: GraphNode[],
): string {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return result.components
    .map((ids) =>
      sortIdsByLabel(ids, nodeById)
        .map((id) => nodeById.get(id)?.label ?? id)
        .join(', '),
    )
    .join(' | ')
}

// Full status line after a CC run: counts, largest size, and formatted groups.
export const buildConnectedComponentsCompletionStatus = (
  result: ConnectedComponentsResult,
  nodes: GraphNode[],
): string => {
  if (result.componentCount === 0) {
    return 'Done. No nodes in the graph.'
  }

  const groupSummary = formatWeakCCGroupsDisplay(result, nodes)

  const plural = result.componentCount === 1 ? 'component' : 'components'
  return `${result.componentCount} connected ${plural} found, largest has ${result.largestComponentSize} node${result.largestComponentSize === 1 ? '' : 's'}. Groups: ${groupSummary}`
}
