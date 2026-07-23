import { describe, it, expect } from 'vitest'

import type { TraversalStrategy } from './algorithmTypes'

import { getDirectedEdgeId, getDirectedEdgeInfo, runWeightedPathfinding } from './weightedPathfinding'

import { makeGraph } from '../__testutils__/fixtures'

const strategies: TraversalStrategy[] = ['bfs', 'dfs']

describe('runWeightedPathfinding', () => {
  // A→D direct costs 10 (1 hop); A→B→D costs 2 (2 hops). The cheapest path must win over the
  // fewest-hop path — that is the whole point of weighting. C is isolated.
  const cheap = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['B', 'D', 1], ['A', 'D', 10]])

  it.each(strategies)('finds the least-cost path, not the fewest-hop one (%s)', (strategy) => {
    const result = runWeightedPathfinding(cheap.nodes, cheap.edges, 'A', 'D', strategy)
    expect(result.pathFound).toBe(true)
    expect(result.pathCost).toBe(2)
    expect(result.pathNodeIds).toEqual(['A', 'B', 'D'])
  })

  it.each(strategies)('reports an unreachable goal with null cost (%s)', (strategy) => {
    const result = runWeightedPathfinding(cheap.nodes, cheap.edges, 'A', 'C', strategy)
    expect(result.pathFound).toBe(false)
    expect(result.pathCost).toBeNull()
    expect(result.pathNodeIds).toEqual([])
  })

  it.each(strategies)('sums edge weights along the chosen path (%s)', (strategy) => {
    // single path A-B(2)-C(3)-D(4) → total 9
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B', 2], ['B', 'C', 3], ['C', 'D', 4]])
    const result = runWeightedPathfinding(nodes, edges, 'A', 'D', strategy)
    expect(result.pathNodeIds).toEqual(['A', 'B', 'C', 'D'])
    expect(result.pathCost).toBe(9)
  })

  it('treats a missing edge weight as 1 (cost equals hop count)', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C'], [['A', 'B'], ['B', 'C']])
    expect(runWeightedPathfinding(nodes, edges, 'A', 'C', 'bfs').pathCost).toBe(2)
  })

  it.each(strategies)('returns a trivial zero-cost path when start equals goal (%s)', (strategy) => {
    const result = runWeightedPathfinding(cheap.nodes, cheap.edges, 'A', 'A', strategy)
    expect(result.pathFound).toBe(true)
    expect(result.pathCost).toBe(0)
    expect(result.pathNodeIds).toEqual(['A'])
  })

  it.each(strategies)('respects edge direction — a forward edge is one-way (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A', 'B'], [['A', 'B', 5, 'forward']])
    expect(runWeightedPathfinding(nodes, edges, 'A', 'B', strategy).pathCost).toBe(5)
    expect(runWeightedPathfinding(nodes, edges, 'B', 'A', strategy).pathFound).toBe(false)
  })

  it('returns an empty result for an empty graph', () => {
    const result = runWeightedPathfinding([], [], 'A', 'B', 'bfs')
    expect(result.pathFound).toBe(false)
    expect(result.pathCost).toBeNull()
    expect(result.steps).toEqual([])
  })

  it('returns an empty result when the start node does not exist', () => {
    const result = runWeightedPathfinding(cheap.nodes, cheap.edges, 'Z', 'D', 'bfs')
    expect(result.pathFound).toBe(false)
    expect(result.pathNodeIds).toEqual([])
  })

  it('emits both discover and settle steps', () => {
    const steps = runWeightedPathfinding(cheap.nodes, cheap.edges, 'A', 'D', 'bfs').steps
    expect(steps.some((s) => s.eventType === 'discover')).toBe(true)
    expect(steps.some((s) => s.eventType === 'settle')).toBe(true)
  })
})

describe('directed edge lookups', () => {
  // e0: A—B both · e1: B→C forward · e2: C→D backward (arrow points D→C, so traversable D→C only)
  const { edges } = makeGraph(['A', 'B', 'C', 'D'], [
    ['A', 'B'],
    ['B', 'C', undefined, 'forward'],
    ['C', 'D', undefined, 'backward'],
  ])

  it('getDirectedEdgeId resolves a both-direction edge either way', () => {
    expect(getDirectedEdgeId(edges, 'A', 'B')).toBe('e0')
    expect(getDirectedEdgeId(edges, 'B', 'A')).toBe('e0')
  })

  it('getDirectedEdgeId honours a forward-only edge', () => {
    expect(getDirectedEdgeId(edges, 'B', 'C')).toBe('e1')
    expect(getDirectedEdgeId(edges, 'C', 'B')).toBeNull()
  })

  it('getDirectedEdgeId honours a backward-only edge', () => {
    expect(getDirectedEdgeId(edges, 'D', 'C')).toBe('e2')
    expect(getDirectedEdgeId(edges, 'C', 'D')).toBeNull()
  })

  it('returns null when no connecting edge exists', () => {
    expect(getDirectedEdgeId(edges, 'A', 'C')).toBeNull()
    expect(getDirectedEdgeInfo(edges, 'A', 'C')).toBeNull()
  })

  it('getDirectedEdgeInfo reports traversal direction relative to the stored edge', () => {
    expect(getDirectedEdgeInfo(edges, 'A', 'B')).toEqual({ id: 'e0', isForward: true })
    expect(getDirectedEdgeInfo(edges, 'B', 'A')).toEqual({ id: 'e0', isForward: false })
    expect(getDirectedEdgeInfo(edges, 'B', 'C')).toEqual({ id: 'e1', isForward: true })
    expect(getDirectedEdgeInfo(edges, 'D', 'C')).toEqual({ id: 'e2', isForward: false })
  })
})
