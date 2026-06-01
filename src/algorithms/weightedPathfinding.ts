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
    kind: 'bfsdfs',
    steps: [],
    detailedSteps: [],
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
  const detailedSteps: WeightedPathStep[] = []
  let order = 1
  let detailedOrder = 1
  let bestGoalCost = Infinity
  let bestGoalPath: string[] = []
  let operationCount = 0

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
    explanation: strategy === 'bfs'
      ? `Cost 0 by definition. BFS uses a queue — neighbors are explored in the order they are discovered, not by cost. Every acyclic path is eventually tried, so the cheapest one to the goal will be found, but not necessarily first.`
      : `Cost 0 by definition. DFS uses a stack — the most-recently-pushed path is explored next, diving deep before backtracking. May reach the goal quickly, but explores every acyclic path to guarantee the cheapest.`,
  }
  steps.push(startDiscover)
  detailedSteps.push({ ...startDiscover, order: detailedOrder++ })

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

    // Collect expansion: push all valid neighbors, then compute minPendingCostAfter.
    type PendingDiscover = {
      nodeId: string
      nodeLabel: string
      fromNodeId: string
      costToNode: number
      prevCost: number | undefined
    }
    const pendingDiscovers: PendingDiscover[] = []

    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      operationCount++
      if (pathSet.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newCost = cost + (edgeInfo?.weight ?? 1)

      if (newCost >= bestGoalCost) continue

      const prevCost = bestKnownCost.get(neighborId)
      if (newCost < (prevCost ?? Infinity)) {
        bestKnownCost.set(neighborId, newCost)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)
        if (neighborNode) {
          pendingDiscovers.push({
            nodeId: neighborId,
            nodeLabel: neighborNode.label,
            fromNodeId: nodeId,
            costToNode: newCost,
            prevCost,
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

    // Compute frontier min AFTER all pushes so the settle guarantee is sound.
    let minPendingCost = Infinity
    for (const fi of frontier) {
      if (fi.cost < minPendingCost) minPendingCost = fi.cost
    }

    // Emit discover steps for this iteration's neighbors.
    for (const d of pendingDiscovers) {
      const improvementNote = d.prevCost === undefined
        ? `First path to this node — no prior entry in the ${containerWord}.`
        : `Improves on previous best: ${d.costToNode} < ${d.prevCost} — old entry remains in the ${containerWord} but will be skipped when popped (lazy deletion).`
      const queueNote = strategy === 'bfs'
        ? `Added to the back of the queue — explored only after all currently-waiting paths.`
        : `Pushed to the top of the stack — this path will be explored next.`
      const explanation = `${improvementNote} ${queueNote} ${containerWord} now holds ${frontier.length} item${frontier.length !== 1 ? 's' : ''}.`
      const discoverStep: WeightedPathStep = {
        ...d,
        order: order++,
        minPendingCostAfter: minPendingCost,
        eventType: 'discover',
        explanation,
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

        const settleExplanation = minPendingCost === Infinity
          ? `${containerWord} is exhausted — no alternative paths remain. The best known cost is now final; no cheaper route can arrive.`
          : `Confirmation rule: any path that could still arrive here must first traverse something in the ${containerWord}, costing at least ${minPendingCost} before even reaching this node. Since best known cost ≤ ${minPendingCost}, no remaining path can undercut it.`

        detailedSteps.push({
          nodeId: id,
          nodeLabel: n.label,
          order: detailedOrder++,
          fromNodeId: bestParent.get(id) ?? null,
          costToNode: knownCost,
          minPendingCostAfter: minPendingCost,
          eventType: 'settle',
          settleReason: reason,
          explanation: settleExplanation,
        })
      }
    }
  }

  // Update final step's explanation if algorithm terminated without finding goal
  if (steps.length > 0 && bestGoalPath.length === 0) {
    const lastStep = steps[steps.length - 1]
    if (lastStep.explanation && (lastStep.explanation.includes('Added to') || lastStep.explanation.includes('Pushed to'))) {
      const action = strategy === 'bfs' ? 'Dequeued' : 'Popped'
      lastStep.explanation = `${action} ${lastStep.nodeLabel}. Queue is empty — search complete.`
    }
  }

  return {
    kind: 'bfsdfs',
    steps,
    detailedSteps,
    pathNodeIds: bestGoalPath,
    startNodeId,
    goalNodeId,
    pathFound: bestGoalPath.length > 0,
    pathCost: bestGoalCost === Infinity ? null : bestGoalCost,
    operationCount,
  }
}
