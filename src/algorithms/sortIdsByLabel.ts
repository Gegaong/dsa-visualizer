import type { GraphNode } from '../types'

// Sorts node ids by their canvas labels (locale-aware); stable tie-breaking by label string.
export function sortIdsByLabel(ids: string[], nodeById: Map<string, GraphNode>): string[] {
  return [...ids].sort((a, b) => {
    const la = nodeById.get(a)?.label ?? ''
    const lb = nodeById.get(b)?.label ?? ''
    return la.localeCompare(lb)
  })
}
