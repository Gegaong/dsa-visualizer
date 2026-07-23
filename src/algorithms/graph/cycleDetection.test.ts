import { describe, it, expect } from 'vitest'

import type { TraversalStrategy } from './algorithmTypes'

import type { GraphEdge } from '../../types'

import { runCycleDetection } from './cycleDetection'

import { makeGraph, type EdgeSpec } from '../__testutils__/fixtures'

const strategies: TraversalStrategy[] = ['bfs', 'dfs']

const forward = (from: string, to: string): EdgeSpec => [from, to, undefined, 'forward']

// Every consecutive pair (plus the wrap-around) of a reported cycle must be a real directed edge.
function isClosedDirectedWalk(cycle: string[], edges: GraphEdge[]): boolean {
  const directed = new Set<string>()
  for (const e of edges) {
    if (e.direction === 'forward' || e.direction === 'both') directed.add(`${e.fromNodeId}->${e.toNodeId}`)
    if (e.direction === 'backward' || e.direction === 'both') directed.add(`${e.toNodeId}->${e.fromNodeId}`)
  }
  return cycle.every((id, i) => directed.has(`${id}->${cycle[(i + 1) % cycle.length]}`))
}

describe('runCycleDetection', () => {
  it.each(strategies)('reports no cycle for a DAG (%s)', (strategy) => {
    // A→B, A→C, B→D, C→D (diamond DAG)
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'D'],
      [forward('A', 'B'), forward('A', 'C'), forward('B', 'D'), forward('C', 'D')],
    )
    expect(runCycleDetection(nodes, edges, strategy).hasCycle).toBe(false)
  })

  it.each(strategies)('finds a directed 3-cycle and returns a valid cycle (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C'],
      [forward('A', 'B'), forward('B', 'C'), forward('C', 'A')],
    )
    const result = runCycleDetection(nodes, edges, strategy)
    expect(result.hasCycle).toBe(true)
    expect(result.cycleNodeIds.slice().sort()).toEqual(['A', 'B', 'C'])
    expect(isClosedDirectedWalk(result.cycleNodeIds, edges)).toBe(true)
  })

  it.each(strategies)('treats a bidirectional edge as a 2-cycle (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A', 'B'], [['A', 'B']]) // 'both'
    const result = runCycleDetection(nodes, edges, strategy)
    expect(result.hasCycle).toBe(true)
    expect(result.cycleNodeIds.slice().sort()).toEqual(['A', 'B'])
  })

  it.each(strategies)('detects a self-loop as a cycle (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A'], [forward('A', 'A')])
    const result = runCycleDetection(nodes, edges, strategy)
    expect(result.hasCycle).toBe(true)
    expect(result.cycleNodeIds).toEqual(['A'])
  })

  it.each(strategies)('a single forward edge is acyclic (%s)', (strategy) => {
    const { nodes, edges } = makeGraph(['A', 'B'], [forward('A', 'B')])
    expect(runCycleDetection(nodes, edges, strategy).hasCycle).toBe(false)
  })

  it.each(strategies)('finds a cycle living in only one component (%s)', (strategy) => {
    // acyclic chain X→Y, plus a separate directed triangle A→B→C→A
    const { nodes, edges } = makeGraph(
      ['A', 'B', 'C', 'X', 'Y'],
      [forward('A', 'B'), forward('B', 'C'), forward('C', 'A'), forward('X', 'Y')],
    )
    expect(runCycleDetection(nodes, edges, strategy).hasCycle).toBe(true)
  })

  it('reports no cycle for an empty graph', () => {
    expect(runCycleDetection([], [], 'dfs').hasCycle).toBe(false)
  })
})
