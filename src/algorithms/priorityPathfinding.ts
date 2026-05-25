import type { GraphEdge, GraphNode } from '../types'

import type { PriorityPathResult, PriorityPathStep } from './algorithmstypes'

import { buildNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

import { formatCost } from '../utils/format'

type PQItem = {
  nodeId: string
  gCost: number
  priority: number
  fromNodeId: string | null
}

// Removes and returns the item with the lowest priority value from the array.
function popMin(pq: PQItem[]): PQItem {
  let minIdx = 0
  for (let i = 1; i < pq.length; i++) {
    if (pq[i].priority < pq[minIdx].priority) minIdx = i
  }
  return pq.splice(minIdx, 1)[0]
}

// Builds node/neighbor/edge lookup structures shared by all priority-queue algorithms.
function buildLookups(nodes: GraphNode[], edges: GraphEdge[]) {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
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

function euclideanDistance(a: GraphNode, b: GraphNode, pixelsPerUnit: number): number {
  if (pixelsPerUnit === 0) return 0
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2) / pixelsPerUnit
}

// Returns true if every edge's weight is >= the Euclidean distance between its endpoints.
// This is a sufficient condition for Euclidean heuristic admissibility.
function checkAdmissibility(nodes: GraphNode[], edges: GraphEdge[], pixelsPerUnit: number): boolean {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  return edges.every((edge) => {
    const from = nodeById.get(edge.fromNodeId)
    const to = nodeById.get(edge.toNodeId)
    if (!from || !to || edge.weight == null) return true
    return edge.weight >= euclideanDistance(from, to, pixelsPerUnit)
  })
}

// settleMode: 'confirmed' = green settle steps, 'assumed' = yellow-green assumed steps, 'none' = no settle steps.
export function runPriorityPathfinding(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  priorityFn: (g: number, h: number) => number,
  heuristicFn: (node: GraphNode, goal: GraphNode) => number,
  algorithmLabel: string,
  settleMode: 'confirmed' | 'assumed' | 'none' = 'confirmed',
  heuristicAdmissible = true,
): PriorityPathResult {
  const empty: PriorityPathResult = {
    kind: 'priority',
    steps: [],
    pathNodeIds: [],
    startNodeId,
    goalNodeId,
    pathFound: false,
    pathCost: null,
    heuristicAdmissible,
  }

  if (nodes.length === 0) return empty

  const { nodeById, outNeighborsById, directedEdgeMap } = buildLookups(nodes, edges)
  const startNode = nodeById.get(startNodeId)
  const goalNode = nodeById.get(goalNodeId)
  if (!startNode || !goalNode) return empty

  const steps: PriorityPathStep[] = []
  let order = 1

  const bestGCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settled = new Set<string>()

  const startH = heuristicFn(startNode, goalNode)
  const startPriority = priorityFn(0, startH)
  const pq: PQItem[] = [{ nodeId: startNodeId, gCost: 0, priority: startPriority, fromNodeId: null }]

  const isAStar = algorithmLabel === 'A*'
  const isGreedy = algorithmLabel === 'Greedy'

  let startExplanation: string
  if (isGreedy) {
    startExplanation = `h = straight-line distance to goal. Greedy orders the priority queue by h alone — actual path cost g is tracked internally but never drives expansion. g=0 at the start.`
  } else if (isAStar) {
    startExplanation = `f = g + h = 0 + ${formatCost(startH)} = ${formatCost(startPriority)}. A* always pops minimum-f next. With an admissible h (never overestimates), the first settlement of any node is provably optimal — f bounds the true cost from below.`
  } else {
    startExplanation = `g=0 at the start. Dijkstra uses priority = g (h=0 always). The priority queue guarantees the next pop is always the cheapest-known unvisited node. With non-negative edge weights, settled costs are immediately final — no future path can undercut them.`
  }

  steps.push({
    nodeId: startNodeId,
    nodeLabel: startNode.label,
    order: order++,
    fromNodeId: null,
    fromNodeLabel: null,
    edgeWeight: null,
    gCost: 0,
    hCost: startH,
    priority: startPriority,
    eventType: 'discover',
    queueSizeAfter: pq.length,
    explanation: startExplanation,
  })

  while (pq.length > 0) {
    const item = popMin(pq)
    const { nodeId, gCost } = item

    // Skip stale entries left in the queue by lazy deletion.
    if (settled.has(nodeId)) continue
    if (gCost > (bestGCost.get(nodeId) ?? Infinity)) continue

    settled.add(nodeId)
    const settledNode = nodeById.get(nodeId)!
    const queueSizeAfterPop = pq.length
    const hCost = heuristicFn(settledNode, goalNode)

    const parentId = bestParent.get(nodeId) ?? null

    if (settleMode !== 'none') {
      const isAssumed = settleMode === 'assumed'
      const settleReason = isAssumed
        ? `${settledNode.label} committed — cost ${formatCost(gCost)} assumed as best so far · ${algorithmLabel}`
        : `${settledNode.label} confirmed — cost ${formatCost(gCost)} is optimal (lowest cost among all unconfirmed nodes) · ${algorithmLabel}`
      const priorityNow = priorityFn(gCost, hCost)
      let settleExplanation: string
      if (isAssumed && isGreedy) {
        settleExplanation = `Smallest h in the queue — Greedy's only criterion. No guarantee about g (actual path cost). Greedy can be misled: a node close in straight-line distance may require a long actual detour, and Greedy never backtracks to find a cheaper route.`
      } else if (isAssumed && isAStar) {
        settleExplanation = `h may overestimate here — the heuristic is inadmissible on this graph (some edge weight < Euclidean distance). When h inflates f, the pop-by-f order no longer guarantees optimality. A* degrades toward Greedy behavior; this cost is committed but could be beaten by a path A* will never explore.`
      } else if (isAStar) {
        settleExplanation = `Admissible h (≤ true remaining cost) means f = g + h ≤ true total cost through this node. Since this f is minimum in the queue, no alternative path can have a lower true cost. Settling here is safe and optimal.`
      } else {
        settleExplanation = `Dijkstra's optimality proof: all edge weights ≥ 0, so any path arriving later must traverse at least one more edge, adding ≥ 0 cost. The popped node always has the globally minimum g — it is immediately final.`
      }
      steps.push({
        nodeId,
        nodeLabel: settledNode.label,
        order: order++,
        fromNodeId: parentId,
        fromNodeLabel: parentId !== null ? (nodeById.get(parentId)?.label ?? null) : null,
        edgeWeight: null,
        gCost,
        hCost,
        priority: priorityNow,
        eventType: isAssumed ? 'assumed' : 'settle',
        queueSizeAfter: queueSizeAfterPop,
        settleReason,
        explanation: settleExplanation,
      })
    }

    if (nodeId === goalNodeId) break

    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      if (settled.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newG = gCost + (edgeInfo?.weight ?? 1)

      // Only push if this path beats the best known cost to this neighbor.
      if (newG < (bestGCost.get(neighborId) ?? Infinity)) {
        const prevG = bestGCost.get(neighborId)
        bestGCost.set(neighborId, newG)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)!
        const newH = heuristicFn(neighborNode, goalNode)
        const newPriority = priorityFn(newG, newH)

        pq.push({ nodeId: neighborId, gCost: newG, priority: newPriority, fromNodeId: nodeId })

        const w = edgeInfo?.weight ?? 1
        let discoverExplanation: string
        if (isGreedy) {
          discoverExplanation = prevG === undefined
            ? `No prior entry for this node. Queued by h=${formatCost(newH)} — actual g=${formatCost(newG)} is accumulated but ignored for ordering. Priority queue position is purely heuristic-driven.`
            : `Relaxation: g improved ${formatCost(newG)} < ${formatCost(prevG)}. Old queue entry remains but will be skipped on pop (lazy deletion). h=${formatCost(newH)} sets the new queue position — g is still ignored.`
        } else if (isAStar) {
          discoverExplanation = prevG === undefined
            ? `First path to this node. f = g + h = ${formatCost(newG)} + ${formatCost(newH)} = ${formatCost(newPriority)}. Queued at this f-value; A* will settle it when it is the minimum-f item.`
            : `Relaxation: g improved ${formatCost(newG)} < ${formatCost(prevG)}, f updated to ${formatCost(newPriority)}. Old queue entry superseded by lazy deletion. A* settles this node when its f is the queue minimum.`
        } else {
          discoverExplanation = prevG === undefined
            ? `First path to this node. Priority = g = ${formatCost(newG)}. Non-negative edge weights ensure no future path can undercut this once the node is popped.`
            : `Relaxation: g improved ${formatCost(newG)} < ${formatCost(prevG)}. Old queue entry superseded by lazy deletion. Next pop will choose whichever remaining entry has the lowest g.`
        }

        steps.push({
          nodeId: neighborId,
          nodeLabel: neighborNode.label,
          order: order++,
          fromNodeId: nodeId,
          fromNodeLabel: settledNode.label,
          edgeWeight: w,
          gCost: newG,
          hCost: newH,
          priority: newPriority,
          eventType: 'discover',
          queueSizeAfter: pq.length,
          explanation: discoverExplanation,
        })
      }
    }
  }

  // Walk bestParent back from goal to reconstruct the optimal path.
  const pathNodeIds: string[] = []
  if (settled.has(goalNodeId)) {
    let cur: string | null = goalNodeId
    while (cur !== null) {
      pathNodeIds.unshift(cur)
      cur = bestParent.get(cur) ?? null
    }
  }

  return {
    kind: 'priority',
    steps,
    pathNodeIds,
    startNodeId,
    goalNodeId,
    pathFound: pathNodeIds.length > 0,
    pathCost: settled.has(goalNodeId) ? (bestGCost.get(goalNodeId) ?? null) : null,
    heuristicAdmissible,
  }
}

// Runs Dijkstra's algorithm: priority = actual cost from start, heuristic = 0.
export function runDijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
): PriorityPathResult {
  return runPriorityPathfinding(nodes, edges, startNodeId, goalNodeId, (g) => g, () => 0, 'Dijkstra')
}

// Runs A*: priority = g + h (Euclidean). Optimal only when heuristic is admissible.
export function runAStar(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  pixelsPerUnit: number,
): PriorityPathResult {
  const heuristicAdmissible = checkAdmissibility(nodes, edges, pixelsPerUnit)
  return runPriorityPathfinding(nodes, edges, startNodeId, goalNodeId, (g, h) => g + h, (a, b) => euclideanDistance(a, b, pixelsPerUnit), 'A*', heuristicAdmissible ? 'confirmed' : 'assumed', heuristicAdmissible)
}

// Runs Greedy Best-First: priority = h only. Fast but not optimal — assumed steps replace confirmed ones.
export function runGreedy(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  pixelsPerUnit: number,
): PriorityPathResult {
  return runPriorityPathfinding(nodes, edges, startNodeId, goalNodeId, (_g, h) => h, (a, b) => euclideanDistance(a, b, pixelsPerUnit), 'Greedy', 'assumed', false)
}
