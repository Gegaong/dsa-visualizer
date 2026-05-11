import type { GraphEdge, GraphNode } from '../types'

// Empty adjacency list slot per node before edges are applied.
function emptyNeighborLists(nodes: GraphNode[]): Map<string, string[]> {
  const neighborsById = new Map<string, string[]>()
  nodes.forEach((node) => neighborsById.set(node.id, []))
  return neighborsById
}

// Directed adjacency: neighbors along edge arrows (forward / backward / both).
export function buildNeighborsMap(nodes: GraphNode[], edges: GraphEdge[]): Map<string, string[]> {
  const neighborsById = emptyNeighborLists(nodes)

  edges.forEach((edge) => {
    const from = neighborsById.get(edge.fromNodeId)
    const to = neighborsById.get(edge.toNodeId)
    if (!from || !to) return

    if (edge.direction === 'both' || edge.direction === 'forward') {
      from.push(edge.toNodeId)
    }
    if (edge.direction === 'both' || edge.direction === 'backward') {
      to.push(edge.fromNodeId)
    }
  })

  return neighborsById
}

// Undirected adjacency for weak connectivity: both endpoints of each edge linked (direction ignored).
export function buildWeaklyConnectedNeighborsMap(
  nodes: GraphNode[],
  edges: GraphEdge[],
): Map<string, string[]> {
  const neighborsById = emptyNeighborLists(nodes)

  edges.forEach((edge) => {
    if (edge.fromNodeId === edge.toNodeId) return
    const from = neighborsById.get(edge.fromNodeId)
    const to = neighborsById.get(edge.toNodeId)
    if (!from || !to) return

    from.push(edge.toNodeId)
    to.push(edge.fromNodeId)
  })

  return neighborsById
}
