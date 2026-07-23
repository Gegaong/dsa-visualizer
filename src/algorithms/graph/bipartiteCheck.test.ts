import { describe, it, expect } from 'vitest'

import type { GraphEdge, GraphNode } from '../../types'

import { runBipartiteCheck } from './bipartiteCheck'

import { makeGraph } from '../__testutils__/fixtures'

// Asserts the returned groups form a proper 2-colouring: every node placed in exactly one group,
// and no (undirected, non-self) edge falling inside a single group.
function assertValidColoring(
  nodes: GraphNode[],
  edges: GraphEdge[],
  groupA: string[],
  groupB: string[],
): void {
  expect([...groupA, ...groupB].sort()).toEqual(nodes.map((n) => n.id).sort())
  const group = new Map<string, 0 | 1>()
  groupA.forEach((id) => group.set(id, 0))
  groupB.forEach((id) => group.set(id, 1))
  for (const edge of edges) {
    if (edge.fromNodeId === edge.toNodeId) continue
    expect(group.get(edge.fromNodeId)).not.toBe(group.get(edge.toNodeId))
  }
}

describe('runBipartiteCheck', () => {
  it.each(['bfs', 'dfs'] as const)('accepts an even cycle C4 (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']],
    )
    const result = runBipartiteCheck(nodes, edges, strategy)
    expect(result.isBipartite).toBe(true)
    assertValidColoring(nodes, edges, result.groupANodeIds, result.groupBNodeIds)
  })

  it.each(['bfs', 'dfs'] as const)('rejects an odd cycle C3 and flags the conflict (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C'], [['A', 'B'], ['B', 'C'], ['C', 'A']])
    const result = runBipartiteCheck(nodes, edges, strategy)
    expect(result.isBipartite).toBe(false)
    expect(result.steps.some((s) => s.conflict)).toBe(true)
  })

  it('rejects a longer odd cycle C5', () => {
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'D', 'E'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'A']],
    )
    expect(runBipartiteCheck(nodes, edges, 'bfs').isBipartite).toBe(false)
  })

  it('treats a path (tree) as bipartite', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'C'], ['C', 'D']])
    const result = runBipartiteCheck(nodes, edges, 'bfs')
    expect(result.isBipartite).toBe(true)
    assertValidColoring(nodes, edges, result.groupANodeIds, result.groupBNodeIds)
  })

  it('fails the whole graph when any single component has an odd cycle', () => {
    // bipartite C4 component + a separate odd triangle
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'D', 'X', 'Y', 'Z'],
      [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['X', 'Y'], ['Y', 'Z'], ['Z', 'X']],
    )
    expect(runBipartiteCheck(nodes, edges, 'bfs').isBipartite).toBe(false)
  })

  it('colours disconnected bipartite components', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['C', 'D']])
    const result = runBipartiteCheck(nodes, edges, 'bfs')
    expect(result.isBipartite).toBe(true)
    assertValidColoring(nodes, edges, result.groupANodeIds, result.groupBNodeIds)
  })

  it('ignores edge direction (a directed triangle is still an odd cycle)', () => {
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C'],
      [
        ['A', 'B', undefined, 'forward'],
        ['B', 'C', undefined, 'forward'],
        ['C', 'A', undefined, 'forward'],
      ],
    )
    expect(runBipartiteCheck(nodes, edges, 'bfs').isBipartite).toBe(false)
  })

  it('ignores self-loops, so a single self-looped node is bipartite', () => {
    const { nodes, edges } = makeGraph(['A'], [['A', 'A']])
    expect(runBipartiteCheck(nodes, edges, 'bfs').isBipartite).toBe(true)
  })

  it('treats a single node and an empty graph as bipartite', () => {
    expect(runBipartiteCheck(makeGraph(['A']).nodes, [], 'bfs').isBipartite).toBe(true)
    expect(runBipartiteCheck([], [], 'bfs').isBipartite).toBe(true)
  })
})
