import type { GraphEdge, GraphNode } from '../types'

import type { TraversalStrategy, WeightedPathResult, WeightedPathStep } from './algorithmTypes'

import { buildWeightedLookups } from './graphAdjacency'

export function getDirectedEdgeId(edges: GraphEdge[], fromId: string, toId: string): string | null {
  for (const edge of edges) {
    if (
      edge.fromNodeId === fromId &&
      edge.toNodeId === toId &&
      (edge.direction === 'forward' || edge.direction === 'both')
    ) {
      return edge.id
    }
    if (
      edge.fromNodeId === toId &&
      edge.toNodeId === fromId &&
      (edge.direction === 'backward' || edge.direction === 'both')
    ) {
      return edge.id
    }
  }
  return null
}

// Like getDirectedEdgeId but also returns whether the traversal goes in the canonical
// forward direction (fromNodeId→toNodeId). Used to track per-direction visits on both-edges.
export function getDirectedEdgeInfo(
  edges: GraphEdge[],
  fromId: string,
  toId: string,
): { id: string; isForward: boolean } | null {
  for (const edge of edges) {
    if (
      edge.fromNodeId === fromId &&
      edge.toNodeId === toId &&
      (edge.direction === 'forward' || edge.direction === 'both')
    ) {
      return { id: edge.id, isForward: true }
    }
    if (
      edge.fromNodeId === toId &&
      edge.toNodeId === fromId &&
      (edge.direction === 'backward' || edge.direction === 'both')
    ) {
      return { id: edge.id, isForward: false }
    }
  }
  return null
}

type PathItem = {
  path: string[]
  pathSet: Set<string>
  cost: number
}

// Both BFS and DFS explore every acyclic path using a frontier of (path, cost) pairs.
// BFS uses a queue; DFS uses a stack.
//
// Emits a single step sequence: discover steps (a node first reached or improved) and
// settle steps (a node's best cost confirmed) interleaved in playback order.
export function runWeightedPathfinding(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  strategy: TraversalStrategy,
): WeightedPathResult {
  const empty: WeightedPathResult = {
    kind: 'bfsdfs',
    steps: [],
    pathNodeIds: [],
    startNodeId,
    goalNodeId,
    pathFound: false,
    pathCost: null,
    operationCount: 0,
  }

  if (nodes.length === 0) return empty

  const { nodeById, outNeighborsById, directedEdgeMap } = buildWeightedLookups(nodes, edges)
  const startNode = nodeById.get(startNodeId)
  if (!startNode) return empty

  const containerWord = strategy === 'bfs' ? 'queue' : 'stack'

  const steps: WeightedPathStep[] = []
  let order = 1
  let bestGoalCost = Infinity
  let bestGoalPath: string[] = []
  let operationCount = 0

  const bestKnownCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settledSet = new Set<string>()

  steps.push({
    nodeId: startNodeId,
    nodeLabel: startNode.label,
    order: order++,
    fromNodeId: null,
    costToNode: 0,
    eventType: 'discover',
  })

  const frontier: PathItem[] = [
    { path: [startNodeId], pathSet: new Set([startNodeId]), cost: 0 },
  ]
  operationCount++  // initial push of start path into the frontier

  while (frontier.length > 0) {
    const item = strategy === 'bfs' ? frontier.shift()! : frontier.pop()!
    operationCount++  // path item dequeue/pop (V term)
    const { path, pathSet, cost } = item
    const nodeId = path[path.length - 1]

    if (cost > (bestKnownCost.get(nodeId) ?? Infinity)) continue
    if (cost >= bestGoalCost) continue

    if (nodeId === goalNodeId) {
      if (cost < bestGoalCost) {
        bestGoalCost = cost
        bestGoalPath = [...path]
      }
      continue
    }

    // Expand: push every valid neighbor (cheaper than its best known cost, acyclic,
    // and still able to beat the best goal). Each push emits a discover step.
    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      operationCount++  // edge examination (E term)
      if (pathSet.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newCost = cost + (edgeInfo?.weight ?? 1)

      if (newCost >= bestGoalCost) continue

      if (newCost < (bestKnownCost.get(neighborId) ?? Infinity)) {
        bestKnownCost.set(neighborId, newCost)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)
        if (neighborNode) {
          steps.push({
            nodeId: neighborId,
            nodeLabel: neighborNode.label,
            order: order++,
            fromNodeId: nodeId,
            costToNode: newCost,
            eventType: 'discover',
          })
        }

        frontier.push({
          path: [...path, neighborId],
          pathSet: new Set([...pathSet, neighborId]),
          cost: newCost,
        })
        operationCount++  // frontier push
      }
    }

    // Cheapest path still waiting in the frontier — computed after all pushes so the settle
    // guarantee is sound: a node whose best cost ≤ this can't be reached any cheaper.
    let minPendingCost = Infinity
    for (const fi of frontier) {
      if (fi.cost < minPendingCost) minPendingCost = fi.cost
    }

    // Emit settle steps for every node confirmed by this iteration's frontier minimum.
    for (const [id, knownCost] of bestKnownCost) {
      if (!settledSet.has(id) && knownCost <= minPendingCost) {
        settledSet.add(id)
        const n = nodeById.get(id)
        if (!n) continue

        const reason = minPendingCost === Infinity
          ? `${n.label} confirmed at cost ${knownCost} — the ${containerWord} is empty, no more paths to explore`
          : `${n.label} confirmed at cost ${knownCost} — cheapest path in the ${containerWord} costs ${minPendingCost}, so ${n.label} cannot be reached for less`

        steps.push({
          nodeId: id,
          nodeLabel: n.label,
          order: order++,
          fromNodeId: bestParent.get(id) ?? null,
          costToNode: knownCost,
          eventType: 'settle',
          settleReason: reason,
        })
      }
    }
  }

  return {
    kind: 'bfsdfs',
    steps,
    pathNodeIds: bestGoalPath,
    startNodeId,
    goalNodeId,
    pathFound: bestGoalPath.length > 0,
    pathCost: bestGoalCost === Infinity ? null : bestGoalCost,
    operationCount,
  }
}
