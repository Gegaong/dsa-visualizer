import { describe, it, expect } from 'vitest'

import { runConnectedComponents } from './connectedComponents'

import { runBipartiteCheck } from './bipartiteCheck'

import { runCycleDetection } from './cycleDetection'

import { runShortestPath } from './shortestPath'

import { runWeightedPathfinding } from './weightedPathfinding'

import { runDijkstra } from './priorityPathfinding'

import { makeGraph } from '../__testutils__/fixtures'

// Shared invariants every playback step sequence must satisfy, regardless of which algorithm
// produced it: steps are numbered 1..N with no gaps or repeats, and every node reference in a
// step (nodeId, fromNodeId, any frontier list) points at a node that actually exists. This is
// what the canvas/playback UI relies on for every algorithm uniformly — a single shared check
// here catches a regression in any one algorithm without needing every algorithm's own test file
// to separately remember to verify it.
function assertStepContract(
  steps: ReadonlyArray<{ order?: number; nodeId: string; fromNodeId: string | null; frontierNodeIds?: string[] }>,
  validNodeIds: Set<string>,
): void {
  expect(steps.length).toBeGreaterThan(0)

  const orders = steps.map((s) => s.order).filter((o): o is number => o !== undefined)
  if (orders.length > 0) {
    expect(orders).toEqual(Array.from({ length: orders.length }, (_, i) => i + 1))
  }

  for (const step of steps) {
    expect(validNodeIds.has(step.nodeId)).toBe(true)
    if (step.fromNodeId !== null && step.fromNodeId !== undefined) {
      expect(validNodeIds.has(step.fromNodeId)).toBe(true)
    }
    for (const id of step.frontierNodeIds ?? []) {
      expect(validNodeIds.has(id)).toBe(true)
    }
  }
}

describe('shared playback step contract', () => {
  // A connected, cyclic, non-bipartite-adjacent graph so every algorithm below has real work to
  // do (a component to find, a cycle to detect, a non-trivial shortest/cheapest path, ...).
  const { nodes, edges } = makeGraph(
    ['A', 'B', 'C', 'D', 'E'],
    [['A', 'B', 2], ['B', 'C', 3], ['C', 'D', 1], ['D', 'E', 4], ['E', 'A', 5], ['B', 'D', 2]],
  )
  const validIds = new Set(nodes.map((n) => n.id))

  it('runConnectedComponents steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runConnectedComponents(nodes, edges, 'bfs').steps, validIds)
  })

  it('runBipartiteCheck steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runBipartiteCheck(nodes, edges, 'bfs').steps, validIds)
  })

  it('runCycleDetection steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runCycleDetection(nodes, edges, 'dfs').steps, validIds)
  })

  it('runShortestPath steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runShortestPath(nodes, edges, 'A', 'D', 'bfs').steps, validIds)
  })

  it('runWeightedPathfinding steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runWeightedPathfinding(nodes, edges, 'A', 'D', 'bfs').steps, validIds)
  })

  it('runDijkstra steps are contiguously ordered and reference real nodes', () => {
    assertStepContract(runDijkstra(nodes, edges, 'A', 'D').steps, validIds)
  })

  // Same checks again on strategy='dfs' / a second algorithm variant, since the contract is
  // supposed to hold regardless of which internal strategy produced the steps.
  it('holds for the dfs strategy too (connected components, bipartite, shortest path)', () => {
    assertStepContract(runConnectedComponents(nodes, edges, 'dfs').steps, validIds)
    assertStepContract(runBipartiteCheck(nodes, edges, 'dfs').steps, validIds)
    assertStepContract(runShortestPath(nodes, edges, 'A', 'D', 'dfs').steps, validIds)
  })
})
