import type { GraphEdge, GraphNode } from '../types'

import type { PriorityPathResult, PriorityPathStep } from './algorithmstypes'

import { buildNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

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

// Shared core for Dijkstra, A*, and Greedy. The caller supplies:
//   priorityFn    — maps (g, h) to the queue ordering value: g for Dijkstra, g+h for A*, h for Greedy.
//   heuristicFn   — estimates remaining cost from a node to the goal (always 0 for Dijkstra).
//   algorithmLabel — shown in settle-reason text and status messages.
//
// Step sequence: one discover step when a node enters the queue, one settle step on pop.
// Both settle and discover steps are written to the single steps array (no separate detailedSteps).
export function runPriorityPathfinding(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  priorityFn: (g: number, h: number) => number,
  heuristicFn: (node: GraphNode, goal: GraphNode) => number,
  algorithmLabel: string,
): PriorityPathResult {
  const empty: PriorityPathResult = {
    kind: 'priority',
    steps: [],
    pathNodeIds: [],
    startNodeId,
    goalNodeId,
    pathFound: false,
    pathCost: null,
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
    const settleReason = `${settledNode.label} confirmed — cost ${gCost} is optimal (cheapest unvisited node) · ${algorithmLabel}`

    steps.push({
      nodeId,
      nodeLabel: settledNode.label,
      order: order++,
      fromNodeId: parentId,
      fromNodeLabel: parentId !== null ? (nodeById.get(parentId)?.label ?? null) : null,
      edgeWeight: null,
      gCost,
      hCost,
      priority: priorityFn(gCost, hCost),
      eventType: 'settle',
      queueSizeAfter: queueSizeAfterPop,
      settleReason,
    })

    if (nodeId === goalNodeId) break

    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      if (settled.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newG = gCost + (edgeInfo?.weight ?? 1)

      // Only push if this path beats the best known cost to this neighbor.
      if (newG < (bestGCost.get(neighborId) ?? Infinity)) {
        bestGCost.set(neighborId, newG)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)!
        const newH = heuristicFn(neighborNode, goalNode)
        const newPriority = priorityFn(newG, newH)

        pq.push({ nodeId: neighborId, gCost: newG, priority: newPriority, fromNodeId: nodeId })

        steps.push({
          nodeId: neighborId,
          nodeLabel: neighborNode.label,
          order: order++,
          fromNodeId: nodeId,
          fromNodeLabel: settledNode.label,
          edgeWeight: edgeInfo?.weight ?? 1,
          gCost: newG,
          hCost: newH,
          priority: newPriority,
          eventType: 'discover',
          queueSizeAfter: pq.length,
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
  }
}

// Runs Dijkstra's algorithm: priority = actual cost from start, heuristic = 0.
export function runDijkstra(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
): PriorityPathResult {
  return runPriorityPathfinding(
    nodes,
    edges,
    startNodeId,
    goalNodeId,
    (g) => g,
    () => 0,
    'Dijkstra',
  )
}
