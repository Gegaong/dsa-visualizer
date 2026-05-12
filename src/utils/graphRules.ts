import type { GraphEdge, GraphNode } from '../types'

// Validate whether an edge direction is allowed when one or both endpoints are null-valued.
export const isEdgeDirectionAllowed = (
  fromNode: GraphNode | undefined,
  toNode: GraphNode | undefined,
  direction: GraphEdge['direction'],
) => {
  if (!fromNode || !toNode) {
    return false
  }

  if (fromNode.value === null) {
    if (direction === 'forward') return false
  }

  if (toNode.value === null) {
    if (direction === 'backward') return false
  }

  return true
}

// Remove outgoing capability from edges touching nodes that became null.
export const sanitizeEdgesForNullNodes = (edges: GraphEdge[], nodeIds: string[]) => {
  if (nodeIds.length === 0) {
    return edges
  }

  const nullNodeIdSet = new Set(nodeIds)
  const nextEdges: GraphEdge[] = []

  edges.forEach((edge) => {
    const fromIsNull = nullNodeIdSet.has(edge.fromNodeId)
    const toIsNull = nullNodeIdSet.has(edge.toNodeId)

    if (!fromIsNull && !toIsNull) {
      nextEdges.push(edge)
      return
    }

    // If both endpoints are null, no legal direction remains.
    if (fromIsNull && toIsNull) {
      return
    }

    if (fromIsNull) {
      if (edge.direction === 'forward') return
      if (edge.direction === 'both') {
        nextEdges.push({ ...edge, direction: 'backward' })
        return
      }
      nextEdges.push(edge)
      return
    }

    if (toIsNull) {
      if (edge.direction === 'backward') return
      if (edge.direction === 'both') {
        nextEdges.push({ ...edge, direction: 'forward' })
        return
      }
      nextEdges.push(edge)
      return
    }

    nextEdges.push(edge)
  })

  return nextEdges
}

// Check whether an undirected pair already has an edge in either direction.
export const edgeExistsBetweenNodes = (edges: GraphEdge[], firstNodeId: string, secondNodeId: string) => {
  return edges.some(
    (edge) =>
      (edge.fromNodeId === firstNodeId && edge.toNodeId === secondNodeId) ||
      (edge.fromNodeId === secondNodeId && edge.toNodeId === firstNodeId),
  )
}

// Find nodes by id and return whether an edge can be created between them.
export const canCreateEdge = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  fromId: string,
  toId: string,
  direction: GraphEdge['direction'],
) => {
  if (fromId === toId) {
    return false
  }

  if (edgeExistsBetweenNodes(edges, fromId, toId)) {
    return false
  }

  const fromNode = nodes.find((node) => node.id === fromId)
  const toNode = nodes.find((node) => node.id === toId)
  if (!isEdgeDirectionAllowed(fromNode, toNode, direction)) {
    return false
  }

  return true
}

// Pick the next valid edge direction from the cycle, or keep the current one.
export const getNextAllowedEdgeDirection = (
  edge: GraphEdge,
  nodes: GraphNode[],
) => {
  const fromNode = nodes.find((node) => node.id === edge.fromNodeId)
  const toNode = nodes.find((node) => node.id === edge.toNodeId)
  const directionCycle: GraphEdge['direction'][] = ['both', 'forward', 'backward']
  const startIndex = directionCycle.indexOf(edge.direction)

  let offset = 1
  while (offset <= directionCycle.length) {
    const candidateIndex = (startIndex + offset) % directionCycle.length
    const candidateDirection = directionCycle[candidateIndex]
    if (isEdgeDirectionAllowed(fromNode, toNode, candidateDirection)) {
      return candidateDirection
    }
    offset += 1
  }

  return edge.direction
}
