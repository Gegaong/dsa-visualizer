import type { GraphEdge, GraphNode } from '../types'

import { sortIdsByLabel } from './sortIdsByLabel'

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

// Undirected adjacency: both endpoints of each edge linked (edge direction ignored).
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

export type WeightedLookups = {
  nodeById: Map<string, GraphNode>
  // Directed out-neighbors per node, each list sorted by visible label (deterministic playback).
  outNeighborsById: Map<string, string[]>
  // Keyed `from:to` (honoring edge direction); value carries the traversal weight + edge id.
  directedEdgeMap: Map<string, { weight: number; id: string }>
}

// Node / sorted-neighbor / directed-edge lookups shared by every weighted pathfinding algorithm.
export function buildWeightedLookups(nodes: GraphNode[], edges: GraphEdge[]): WeightedLookups {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const rawNeighbors = buildNeighborsMap(nodes, edges)
  const outNeighborsById = new Map<string, string[]>()
  rawNeighbors.forEach((ids, id) => outNeighborsById.set(id, sortIdsByLabel(ids, nodeById)))

  const directedEdgeMap = new Map<string, { weight: number; id: string }>()
  for (const edge of edges) {
    const info = { weight: edge.weight ?? 1, id: edge.id }
    if (edge.direction === 'forward' || edge.direction === 'both') {
      directedEdgeMap.set(`${edge.fromNodeId}:${edge.toNodeId}`, info)
    }
    if (edge.direction === 'backward' || edge.direction === 'both') {
      directedEdgeMap.set(`${edge.toNodeId}:${edge.fromNodeId}`, info)
    }
  }

  return { nodeById, outNeighborsById, directedEdgeMap }
}
