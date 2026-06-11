import { describe, it, expect } from 'vitest'

import type { TraversalStrategy } from './algorithmstypes'

import { runConnectedComponents } from './connectedComponents'

import { makeGraph } from './__testutils__/fixtures'

const strategies: TraversalStrategy[] = ['bfs', 'dfs']

// Sorts a list of components into a canonical shape so two runs can be compared regardless of
// the order components were discovered or nodes were visited within them.
function normalise(groups: string[][]): string[][] {
  return groups.map((g) => [...g].sort()).sort((a, b) => a[0].localeCompare(b[0]))
}

describe('runConnectedComponents', () => {
  it.each(strategies)('counts disjoint components and sizes the largest (%s)', (strategy) => {
    // {A,B,C} triangle, {D,E} edge, {F} isolated
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'D', 'E', 'F'],
      [['A', 'B'], ['B', 'C'], ['C', 'A'], ['D', 'E']],
    )
    const result = runConnectedComponents(nodes, edges, strategy)

    expect(result.componentCount).toBe(3)
    expect(result.largestComponentSize).toBe(3)
    // Exact grouping, not just sizes: the triangle, the edge, and the isolated node.
    expect(normalise(result.components)).toEqual([['A', 'B', 'C'], ['D', 'E'], ['F']])
  })

  it('treats every node as its own component when there are no edges', () => {
    const { nodes } = makeGraph(['A', 'B', 'C'], [])
    const result = runConnectedComponents(nodes, [], 'bfs')
    expect(result.componentCount).toBe(3)
    expect(result.largestComponentSize).toBe(1)
  })

  it('merges a connected chain into one component', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'C'], ['C', 'D']])
    const result = runConnectedComponents(nodes, edges, 'bfs')
    expect(result.componentCount).toBe(1)
    expect(result.largestComponentSize).toBe(4)
  })

  it('ignores edge direction (weak connectivity)', () => {
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C'],
      [['A', 'B', undefined, 'forward'], ['C', 'B', undefined, 'backward']],
    )
    expect(runConnectedComponents(nodes, edges, 'bfs').componentCount).toBe(1)
  })

  it('ignores self-loops when grouping', () => {
    const { nodes, edges } = makeGraph(['A', 'B'], [['A', 'A'], ['A', 'B']])
    const result = runConnectedComponents(nodes, edges, 'bfs')
    expect(result.componentCount).toBe(1)
    expect(result.largestComponentSize).toBe(2)
  })

  it('is unaffected by duplicate edges', () => {
    const { nodes, edges } = makeGraph(['A', 'B'], [['A', 'B'], ['A', 'B'], ['B', 'A']])
    expect(runConnectedComponents(nodes, edges, 'bfs').componentCount).toBe(1)
  })

  it('returns empty results for an empty graph', () => {
    const result = runConnectedComponents([], [], 'bfs')
    expect(result.componentCount).toBe(0)
    expect(result.largestComponentSize).toBe(0)
    expect(result.components).toEqual([])
  })

  it('strategy changes visit order but not the partition', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['C', 'D']])
    const bfs = runConnectedComponents(nodes, edges, 'bfs')
    const dfs = runConnectedComponents(nodes, edges, 'dfs')
    expect(normalise(bfs.components)).toEqual(normalise(dfs.components))
  })
})
