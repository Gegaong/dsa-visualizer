import type { GraphNode } from '../../types'

// Sorts node ids by their canvas labels in natural spreadsheet order (A…Z before AA).
// Shorter labels always come first; plain localeCompare would put AA before B.
export function sortIdsByLabel(ids: string[], nodeById: Map<string, GraphNode>): string[] {
  return [...ids].sort((a, b) => {
    const la = nodeById.get(a)?.label ?? ''
    const lb = nodeById.get(b)?.label ?? ''
    return la.length - lb.length || la.localeCompare(lb)
  })
}
