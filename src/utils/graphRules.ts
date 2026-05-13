import type { GraphEdge } from '../types'

// Check whether an undirected pair already has an edge in either direction.
export const edgeExistsBetweenNodes = (edges: GraphEdge[], firstNodeId: string, secondNodeId: string) => {
  return edges.some(
    (edge) =>
      (edge.fromNodeId === firstNodeId && edge.toNodeId === secondNodeId) ||
      (edge.fromNodeId === secondNodeId && edge.toNodeId === firstNodeId),
  )
}

// Return false for self-loops or if an edge already exists between the two nodes.
export const canCreateEdge = (
  edges: GraphEdge[],
  fromId: string,
  toId: string,
) => {
  if (fromId === toId) return false
  if (edgeExistsBetweenNodes(edges, fromId, toId)) return false
  return true
}

// Cycle edge direction: both → forward → backward → both.
export const getNextAllowedEdgeDirection = (edge: GraphEdge): GraphEdge['direction'] => {
  const cycle: GraphEdge['direction'][] = ['both', 'forward', 'backward']
  return cycle[(cycle.indexOf(edge.direction) + 1) % cycle.length]
}
