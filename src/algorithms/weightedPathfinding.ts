import type { GraphEdge, GraphNode } from '../types'

import type { TraversalStrategy, WeightedPathResult, WeightedPathStep } from './algorithmstypes'

import { buildNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

type WeightedLookups = {
  nodeById: Map<string, GraphNode>
  outNeighborsById: Map<string, string[]>
  directedEdgeMap: Map<string, { weight: number; id: string }>
}

function buildWeightedLookups(nodes: GraphNode[], edges: GraphEdge[]): WeightedLookups {
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

type PathItem = {
  path: string[]
  pathSet: Set<string>
  cost: number
}

// Both BFS and DFS explore every acyclic path using a frontier of (path, cost) pairs.
// BFS uses a FIFO queue; DFS uses a LIFO stack.
//
// Two step sequences are produced:
//   steps        — discover steps only; settlement inferred via minPendingCostAfter.
//   detailedSteps — discover + explicit settle steps interleaved; used in detail mode.
export function runWeightedPathfinding(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  strategy: TraversalStrategy,
): WeightedPathResult {
  const empty: WeightedPathResult = {
    steps: [],
    detailedSteps: [],
    pathNodeIds: [],
    startNodeId,
    goalNodeId,
    pathFound: false,
    pathCost: null,
  }

  if (nodes.length === 0) return empty

  const { nodeById, outNeighborsById, directedEdgeMap } = buildWeightedLookups(nodes, edges)
  const startNode = nodeById.get(startNodeId)
  if (!startNode) return empty

  const steps: WeightedPathStep[] = []
  const detailedSteps: WeightedPathStep[] = []
  let order = 1
  let detailedOrder = 1
  let bestGoalCost = Infinity
  let bestGoalPath: string[] = []

  const bestKnownCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settledSet = new Set<string>()

  const startDiscover: WeightedPathStep = {
    nodeId: startNodeId,
    nodeLabel: startNode.label,
    order: order++,
    fromNodeId: null,
    costToNode: 0,
    minPendingCostAfter: Infinity,
    eventType: 'discover',
  }
  steps.push(startDiscover)
  detailedSteps.push({ ...startDiscover, order: detailedOrder++ })

  const frontier: PathItem[] = [
    { path: [startNodeId], pathSet: new Set([startNodeId]), cost: 0 },
  ]

  while (frontier.length > 0) {
    const item = strategy === 'bfs' ? frontier.shift()! : frontier.pop()!
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

    // Collect expansion: push all valid neighbors, then compute minPendingCostAfter.
    type PendingDiscover = {
      nodeId: string
      nodeLabel: string
      fromNodeId: string
      costToNode: number
    }
    const pendingDiscovers: PendingDiscover[] = []

    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      if (pathSet.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newCost = cost + (edgeInfo?.weight ?? 1)

      if (newCost >= bestGoalCost) continue

      if (newCost < (bestKnownCost.get(neighborId) ?? Infinity)) {
        bestKnownCost.set(neighborId, newCost)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)
        if (neighborNode) {
          pendingDiscovers.push({
            nodeId: neighborId,
            nodeLabel: neighborNode.label,
            fromNodeId: nodeId,
            costToNode: newCost,
          })
        }

        frontier.push({
          path: [...path, neighborId],
          pathSet: new Set([...pathSet, neighborId]),
          cost: newCost,
        })
      }
    }

    // Compute frontier min AFTER all pushes so the settle guarantee is sound.
    let minPendingCost = Infinity
    for (const fi of frontier) {
      if (fi.cost < minPendingCost) minPendingCost = fi.cost
    }

    // Emit discover steps for this iteration's neighbors.
    for (const d of pendingDiscovers) {
      const discoverStep: WeightedPathStep = {
        ...d,
        order: order++,
        minPendingCostAfter: minPendingCost,
        eventType: 'discover',
      }
      steps.push(discoverStep)
      detailedSteps.push({ ...discoverStep, order: detailedOrder++ })
    }

    // Emit settle steps (detailed only) for every node confirmed by this iteration.
    for (const [id, knownCost] of bestKnownCost) {
      if (!settledSet.has(id) && knownCost <= minPendingCost) {
        settledSet.add(id)
        const n = nodeById.get(id)
        if (!n) continue

        const reason = minPendingCost === Infinity
          ? `${n.label} confirmed at cost ${knownCost} — queue is empty, no more paths to explore`
          : `${n.label} confirmed at cost ${knownCost} — cheapest queued path costs ${minPendingCost}, so ${n.label} cannot be reached for less`

        detailedSteps.push({
          nodeId: id,
          nodeLabel: n.label,
          order: detailedOrder++,
          fromNodeId: bestParent.get(id) ?? null,
          costToNode: knownCost,
          minPendingCostAfter: minPendingCost,
          eventType: 'settle',
          settleReason: reason,
        })
      }
    }
  }

  return {
    steps,
    detailedSteps,
    pathNodeIds: bestGoalPath,
    startNodeId,
    goalNodeId,
    pathFound: bestGoalPath.length > 0,
    pathCost: bestGoalCost === Infinity ? null : bestGoalCost,
  }
}
