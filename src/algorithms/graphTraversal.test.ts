import { describe, it, expect } from 'vitest'

import type { TraversalStrategy } from './algorithmTypes'

import { traverseReachableFrom } from './graphTraversal'

// Runs a traversal and returns the order nodes were visited, with optional neighbour ordering.
function visitOrder(
  neighborsById: Map<string, string[]>,
  startId: string,
  strategy: TraversalStrategy,
  orderNeighbors?: (ids: string[]) => string[],
): string[] {
  const order: string[] = []
  traverseReachableFrom({
    neighborsById,
    startId,
    visited: new Set<string>(),
    strategy,
    orderNeighbors,
    onVisit: (id) => {
      order.push(id)
    },
  })
  return order
}

describe('traverseReachableFrom', () => {
  //   A
  //  / \
  // B   C
  // |   |
  // D   E
  const tree = new Map<string, string[]>([
    ['A', ['B', 'C']],
    ['B', ['D']],
    ['C', ['E']],
    ['D', []],
    ['E', []],
  ])

  it('BFS visits level by level', () => {
    expect(visitOrder(tree, 'A', 'bfs')).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('DFS dives down the first branch before the second', () => {
    expect(visitOrder(tree, 'A', 'dfs')).toEqual(['A', 'B', 'D', 'C', 'E'])
  })

  it('reports the discovering parent of each visited node', () => {
    const parents = new Map<string, string | null>()
    traverseReachableFrom({
      neighborsById: tree,
      startId: 'A',
      visited: new Set<string>(),
      strategy: 'bfs',
      onVisit: (id, parentId) => {
        parents.set(id, parentId)
      },
    })
    expect(parents.get('A')).toBeNull()
    expect(parents.get('B')).toBe('A')
    expect(parents.get('C')).toBe('A')
    expect(parents.get('D')).toBe('B')
    expect(parents.get('E')).toBe('C')
  })

  it('visits a lone node exactly once', () => {
    expect(visitOrder(new Map([['A', []]]), 'A', 'bfs')).toEqual(['A'])
  })

  it('does nothing when the start node is already visited', () => {
    const order: string[] = []
    traverseReachableFrom({
      neighborsById: tree,
      startId: 'A',
      visited: new Set(['A']),
      strategy: 'bfs',
      onVisit: (id) => {
        order.push(id)
      },
    })
    expect(order).toEqual([])
  })

  it('never passes through a pre-visited node (cutting off what only it reaches)', () => {
    const order: string[] = []
    traverseReachableFrom({
      neighborsById: tree,
      startId: 'A',
      visited: new Set(['C']), // C already done → E (reachable only via C) is unreachable
      strategy: 'bfs',
      onVisit: (id) => {
        order.push(id)
      },
    })
    expect(order).toEqual(['A', 'B', 'D'])
  })

  it('visits a re-reachable node (diamond) only once', () => {
    // A→B, A→C, B→D, C→D : D is reachable two ways
    const diamond = new Map<string, string[]>([
      ['A', ['B', 'C']],
      ['B', ['D']],
      ['C', ['D']],
      ['D', []],
    ])
    const order = visitOrder(diamond, 'A', 'bfs')
    expect(order.slice().sort()).toEqual(['A', 'B', 'C', 'D'])
    expect(order.filter((id) => id === 'D')).toHaveLength(1)
  })

  it('respects a custom neighbour ordering', () => {
    const reverse = (ids: string[]) => [...ids].reverse()
    expect(visitOrder(tree, 'A', 'bfs', reverse)).toEqual(['A', 'C', 'B', 'E', 'D'])
  })

  it('stops early when onVisit returns "stop"', () => {
    const seen: string[] = []
    traverseReachableFrom({
      neighborsById: tree,
      startId: 'A',
      visited: new Set<string>(),
      strategy: 'bfs',
      onVisit: (id) => {
        seen.push(id)
        return id === 'B' ? 'stop' : undefined
      },
    })
    expect(seen).toEqual(['A', 'B'])
  })
})
