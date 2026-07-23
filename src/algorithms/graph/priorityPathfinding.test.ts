import { describe, it, expect } from 'vitest'

import { runAStar, runDijkstra, runGreedy, runPriorityPathfinding } from './priorityPathfinding'

import { makeGraph } from '../__testutils__/fixtures'

// A large pixels-per-unit shrinks the Euclidean heuristic toward zero, which guarantees it is
// admissible — so A* must reproduce Dijkstra's optimum.
const ADMISSIBLE = 100000

describe('priority pathfinding', () => {
  // A→B 1, A→C 4, B→C 2, C→D 1, B→D 7. Cheapest A→D is A-B-C-D = 4 (beats A-C-D = 5, A-B-D = 8).
  const graph = makeGraph(
    ['A', 'B', 'C', 'D'],
    [['A', 'B', 1], ['A', 'C', 4], ['B', 'C', 2], ['C', 'D', 1], ['B', 'D', 7]],
  )

  it('Dijkstra returns the optimal cost and path', () => {
    const result = runDijkstra(graph.nodes, graph.edges, 'A', 'D')
    expect(result.pathFound).toBe(true)
    expect(result.pathCost).toBe(4)
    expect(result.pathNodeIds).toEqual(['A', 'B', 'C', 'D'])
  })

  it('A* with an admissible heuristic matches Dijkstra', () => {
    const astar = runAStar(graph.nodes, graph.edges, 'A', 'D', ADMISSIBLE)
    const dijkstra = runDijkstra(graph.nodes, graph.edges, 'A', 'D')
    expect(astar.heuristicAdmissible).toBe(true)
    expect(astar.pathCost).toBe(dijkstra.pathCost)
    expect(astar.pathNodeIds).toEqual(dijkstra.pathNodeIds)
  })

  it('A* flags a non-admissible heuristic but still finds a path', () => {
    // pixelsPerUnit = 1 makes the Euclidean heuristic (node spacing ~100) dwarf the edge weights,
    // so the heuristic is not admissible.
    const astar = runAStar(graph.nodes, graph.edges, 'A', 'D', 1)
    expect(astar.heuristicAdmissible).toBe(false)
    expect(astar.pathFound).toBe(true)
  })

  it('Greedy returns a valid path that can be worse than the optimum', () => {
    // A-B-D costs 2 (optimal); A-C-D costs 101. C sits geometrically closer to D, so greedy
    // (heuristic-only, cost-blind) dives into C and commits to the expensive route.
    const g = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B', 1], ['B', 'D', 1], ['A', 'C', 1], ['C', 'D', 100]])
    const greedy = runGreedy(g.nodes, g.edges, 'A', 'D', 100)
    const optimal = runDijkstra(g.nodes, g.edges, 'A', 'D')
    expect(greedy.pathFound).toBe(true)
    expect(greedy.pathNodeIds).toEqual(['A', 'C', 'D'])
    expect(greedy.pathCost).toBe(101)
    expect(optimal.pathNodeIds).toEqual(['A', 'B', 'D'])
    expect(optimal.pathCost).toBe(2)
  })

  it('Dijkstra reports an unreachable goal with null cost', () => {
    const { nodes, edges } = makeGraph(['A', 'B', 'X'], [['A', 'B', 1]]) // X isolated
    const result = runDijkstra(nodes, edges, 'A', 'X')
    expect(result.pathFound).toBe(false)
    expect(result.pathCost).toBeNull()
  })

  it('returns a trivial zero-cost path when start equals goal', () => {
    const result = runDijkstra(graph.nodes, graph.edges, 'A', 'A')
    expect(result.pathFound).toBe(true)
    expect(result.pathCost).toBe(0)
    expect(result.pathNodeIds).toEqual(['A'])
  })

  it('returns an empty result for an empty graph or an unknown start node', () => {
    expect(runDijkstra([], [], 'A', 'D').pathFound).toBe(false)
    expect(runDijkstra(graph.nodes, graph.edges, 'Z', 'D').pathFound).toBe(false)
  })

  it('Dijkstra emits confirmed "settle" steps; Greedy emits "assumed" steps', () => {
    const dijkstra = runDijkstra(graph.nodes, graph.edges, 'A', 'D')
    const greedy = runGreedy(graph.nodes, graph.edges, 'A', 'D', ADMISSIBLE)
    expect(dijkstra.steps.some((s) => s.eventType === 'settle')).toBe(true)
    expect(greedy.steps.some((s) => s.eventType === 'assumed')).toBe(true)
  })

  it("settleMode 'none' suppresses every settle/assumed step", () => {
    // Dijkstra's parameters (priority = g, heuristic = 0) but with settle steps turned off.
    const result = runPriorityPathfinding(graph.nodes, graph.edges, 'A', 'D', (g) => g, () => 0, 'Dijkstra', 'none')
    expect(result.pathCost).toBe(4)
    expect(result.steps.every((s) => s.eventType === 'discover')).toBe(true)
  })
})
