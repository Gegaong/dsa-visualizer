import { describe, it, expect } from 'vitest'

import type { GraphEdge, GraphNode } from '../types'

import { runDijkstra } from './priorityPathfinding'

import { randomWeightedGraph } from './__testutils__/fixtures'

// Independent oracle: exhaustively explore every simple path from start to goal and keep the
// cheapest total weight. Obviously correct, far too slow for production — exactly what we want to
// cross-check the real implementation against.
function bruteForceShortest(
  nodes: GraphNode[],
  edges: GraphEdge[],
  start: string,
  goal: string,
): number | null {
  const adj = new Map<string, Array<{ to: string; w: number }>>()
  for (const node of nodes) adj.set(node.id, [])
  for (const edge of edges) {
    const w = edge.weight ?? 1
    adj.get(edge.fromNodeId)?.push({ to: edge.toNodeId, w })
    adj.get(edge.toNodeId)?.push({ to: edge.fromNodeId, w }) // builder edges are undirected ('both')
  }

  let best: number | null = null
  const visited = new Set<string>()
  const walk = (at: string, cost: number) => {
    if (at === goal) {
      if (best === null || cost < best) best = cost
      return
    }
    visited.add(at)
    for (const { to, w } of adj.get(at) ?? []) {
      if (!visited.has(to)) walk(to, cost + w)
    }
    visited.delete(at)
  }
  walk(start, 0)
  return best
}

describe('Dijkstra vs brute-force oracle', () => {
  it('matches the exhaustive optimum across 100 random graphs', () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const { nodes, edges } = randomWeightedGraph(seed, 7)
      const expected = bruteForceShortest(nodes, edges, 'N0', 'N6')
      const result = runDijkstra(nodes, edges, 'N0', 'N6')

      if (expected === null) {
        expect(result.pathFound, `seed ${seed}: N6 should be unreachable from N0`).toBe(false)
      } else {
        expect(result.pathCost, `seed ${seed}`).toBe(expected)
      }
    }
  })
})
