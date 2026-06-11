import { describe, it, expect } from 'vitest'

import type { TraversalStrategy } from './algorithmstypes'

import type { GraphEdge } from '../types'

import { runShortestPath } from './shortestPath'

import { makeGraph } from './__testutils__/fixtures'

const strategies: TraversalStrategy[] = ['bfs', 'dfs']

// True when each consecutive pair of the path is joined by a direction-respecting edge.
function isConnectedPath(path: string[], edges: GraphEdge[]): boolean {
  const directed = new Set<string>()
  for (const e of edges) {
    if (e.direction === 'forward' || e.direction === 'both') directed.add(`${e.fromNodeId}->${e.toNodeId}`)
    if (e.direction === 'backward' || e.direction === 'both') directed.add(`${e.toNodeId}->${e.fromNodeId}`)
  }
  return path.slice(1).every((id, i) => directed.has(`${path[i]}->${id}`))
}

describe('runShortestPath', () => {
  // A─B─C─D and A─E─D : fewest-hop A→D is A-E-D (2 hops), not A-B-C-D (3). F is isolated.
  const base = makeGraph(
    ['A', 'B', 'C', 'D', 'E', 'F'],
    [['A', 'B'], ['B', 'C'], ['C', 'D'], ['A', 'E'], ['E', 'D']],
  )

  it.each(strategies)('finds the fewest-hop path (%s)', (strategy) => {
    const result = runShortestPath(base.nodes, base.edges, 'A', 'D', strategy)
    expect(result.pathFound).toBe(true)
    expect(result.pathNodeIds).toEqual(['A', 'E', 'D'])
  })

  it.each(strategies)('returns a connected path of optimal length (%s)', (strategy) => {
    const result = runShortestPath(base.nodes, base.edges, 'A', 'D', strategy)
    expect(result.pathNodeIds.length - 1).toBe(2) // 2 hops
    expect(isConnectedPath(result.pathNodeIds, base.edges)).toBe(true)
  })

  it.each(strategies)('returns a direct edge as a one-hop path (%s)', (strategy) => {
    expect(runShortestPath(base.nodes, base.edges, 'A', 'B', strategy).pathNodeIds).toEqual(['A', 'B'])
  })

  it.each(strategies)('returns one valid shortest path when several tie (%s)', (strategy) => {
    // A-B-D and A-C-D are both 2 hops; either is acceptable as long as it is valid and optimal.
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'D'], ['A', 'C'], ['C', 'D']])
    const result = runShortestPath(nodes, edges, 'A', 'D', strategy)
    expect(result.pathFound).toBe(true)
    expect(result.pathNodeIds.length - 1).toBe(2)
    expect(isConnectedPath(result.pathNodeIds, edges)).toBe(true)
  })

  it.each(strategies)('reports an unreachable goal (%s)', (strategy) => {
    const result = runShortestPath(base.nodes, base.edges, 'A', 'F', strategy)
    expect(result.pathFound).toBe(false)
    expect(result.pathNodeIds).toEqual([])
  })

  it.each(strategies)('returns a trivial path when start equals goal (%s)', (strategy) => {
    const result = runShortestPath(base.nodes, base.edges, 'A', 'A', strategy)
    expect(result.pathFound).toBe(true)
    expect(result.pathNodeIds).toEqual(['A'])
  })

  it.each(strategies)('respects edge direction — one-way edges are not traversed backwards (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A', 'B'], [['A', 'B', undefined, 'forward']])
    expect(runShortestPath(nodes, edges, 'A', 'B', strategy).pathFound).toBe(true)
    expect(runShortestPath(nodes, edges, 'B', 'A', strategy).pathFound).toBe(false)
  })
})
