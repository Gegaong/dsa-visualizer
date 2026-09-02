import type { GraphEdge, GraphNode } from '../../types'

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

// Line-by-line Code Execution mode engine for Weighted BFS and DFS
export function runWeightedPathfindingCode(
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

  const isBfs = strategy === 'bfs'
  const containerWord = isBfs ? 'queue' : 'stack'

  const steps: WeightedPathStep[] = []
  let order = 1
  let bestGoalCost = Infinity
  let bestGoalPath: string[] = []
  let operationCount = 0

  const bestKnownCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settledSet = new Set<string>()

  const frontier: PathItem[] = []

  const getCostEntries = () => {
    const res: Record<string, number> = {}
    for (const [id, c] of bestKnownCost) {
      const n = nodeById.get(id)
      if (n) res[n.label] = c
    }
    return res
  }

  const getFrontierLabels = () => {
    return frontier.map((item) => {
      const pathLabels = item.path.map((id) => nodeById.get(id)?.label ?? id).join('→')
      return `(${pathLabels}, ${item.cost})`
    })
  }

  const makeCodeStep = (
    codeLine: number,
    logicLines: number[],
    nodeId: string,
    fromNodeId: string | null,
    costToNode: number,
    eventType: 'discover' | 'settle',
    extra: {
      uLabel?: string | null
      cVal?: number | null
      nbLabel?: string | null
      newCostVal?: number | null
      settleReason?: string
    } = {},
  ): WeightedPathStep => {
    const n = nodeById.get(nodeId)
    return {
      nodeId,
      nodeLabel: n?.label ?? nodeId,
      order: order++,
      fromNodeId,
      costToNode,
      eventType,
      codeLine,
      logicLines,
      uLabel: extra.uLabel ?? null,
      cVal: extra.cVal !== undefined ? extra.cVal : null,
      nbLabel: extra.nbLabel ?? null,
      newCostVal: extra.newCostVal !== undefined ? extra.newCostVal : null,
      bestCostVal: bestGoalCost === Infinity ? null : bestGoalCost,
      frontierLabels: getFrontierLabels(),
      costMap: getCostEntries(),
      settleReason: extra.settleReason,
    }
  }

  // Line 0: WeightedBFS(graph, start, goal) / WeightedDFS(graph, start, goal)
  steps.push(makeCodeStep(0, [0, 1], startNodeId, null, 0, 'discover', {
    uLabel: null,
    cVal: null,
  }))

  // Line 1: cost[start] ← 0; queue/stack ← [(path=[start], c=0)]; bestCost ← ∞; bestPath ← []
  frontier.push({ path: [startNodeId], pathSet: new Set([startNodeId]), cost: 0 })
  operationCount++

  steps.push(makeCodeStep(1, [0, 1], startNodeId, null, 0, 'discover', {
    uLabel: null,
    cVal: null,
  }))

  while (frontier.length > 0) {
    const peekItem = isBfs ? frontier[0] : frontier[frontier.length - 1]
    const peekNodeId = peekItem.path[peekItem.path.length - 1]

    // Line 2: while queue/stack ≠ empty
    steps.push(makeCodeStep(2, [3, 4, 5, 6, 7], peekNodeId, null, peekItem.cost, 'discover', {
      uLabel: null,
      cVal: null,
    }))

    // Line 3: (path, c) ← queue.dequeue() / stack.pop(); u ← path.last
    const item = isBfs ? frontier.shift()! : frontier.pop()!
    operationCount++
    const { path, pathSet, cost } = item
    const uId = path[path.length - 1]
    const uNode = nodeById.get(uId)
    const uLabel = uNode?.label ?? uId

    steps.push(makeCodeStep(3, [3, 4, 5, 6, 7], uId, path.length > 1 ? path[path.length - 2] : null, cost, 'discover', {
      uLabel,
      cVal: cost,
    }))

    // Line 4: if c > cost[u] or c ≥ bestCost: continue
    const currentCostForU = bestKnownCost.get(uId) ?? Infinity
    const isPruned = cost > currentCostForU || cost >= bestGoalCost
    steps.push(makeCodeStep(4, [3, 4, 5, 6, 7], uId, path.length > 1 ? path[path.length - 2] : null, cost, 'discover', {
      uLabel,
      cVal: cost,
    }))
    if (isPruned) continue

    // Line 5: if u = goal: bestCost ← c; bestPath ← path; continue
    if (uId === goalNodeId) {
      if (cost < bestGoalCost) {
        bestGoalCost = cost
        bestGoalPath = [...path]
      }
      steps.push(makeCodeStep(5, [8, 9, 10], uId, path.length > 1 ? path[path.length - 2] : null, cost, 'discover', {
        uLabel,
        cVal: cost,
      }))
      continue
    } else {
      steps.push(makeCodeStep(5, [8, 9, 10], uId, path.length > 1 ? path[path.length - 2] : null, cost, 'discover', {
        uLabel,
        cVal: cost,
      }))
    }

    // Line 6: for each neighbor nb of u in graph:
    steps.push(makeCodeStep(6, [11, 12, 13, 14], uId, null, cost, 'discover', {
      uLabel,
      cVal: cost,
    }))

    const neighbors = outNeighborsById.get(uId) ?? []
    for (const neighborId of neighbors) {
      operationCount++
      const neighborNode = nodeById.get(neighborId)
      const nbLabel = neighborNode?.label ?? neighborId

      const edgeInfo = directedEdgeMap.get(`${uId}:${neighborId}`)
      const newCost = cost + (edgeInfo?.weight ?? 1)

      // Line 7: newCost ← c + w(u, nb)
      steps.push(makeCodeStep(7, [11, 12, 13, 14], neighborId, uId, newCost, 'discover', {
        uLabel,
        cVal: cost,
        nbLabel,
        newCostVal: newCost,
      }))

      // Line 8: if nb ∉ path and newCost < cost[nb] and newCost < bestCost:
      const notInPath = !pathSet.has(neighborId)
      const isCheaper = newCost < (bestKnownCost.get(neighborId) ?? Infinity)
      const beatsGoal = newCost < bestGoalCost
      const passesCheck = notInPath && isCheaper && beatsGoal

      steps.push(makeCodeStep(8, [11, 12, 13, 14], neighborId, uId, newCost, 'discover', {
        uLabel,
        cVal: cost,
        nbLabel,
        newCostVal: newCost,
      }))

      if (passesCheck) {
        bestKnownCost.set(neighborId, newCost)
        bestParent.set(neighborId, uId)

        frontier.push({
          path: [...path, neighborId],
          pathSet: new Set([...pathSet, neighborId]),
          cost: newCost,
        })
        operationCount++

        // Line 9: cost[nb] ← newCost; queue.enqueue / stack.push
        steps.push(makeCodeStep(9, [11, 12, 13, 14], neighborId, uId, newCost, 'discover', {
          uLabel,
          cVal: cost,
          nbLabel,
          newCostVal: newCost,
        }))
      }
    }

    // Check for nodes that can now be settled:
    let minPendingCost = Infinity
    for (const fi of frontier) {
      if (fi.cost < minPendingCost) minPendingCost = fi.cost
    }

    for (const [id, knownCost] of bestKnownCost) {
      if (!settledSet.has(id) && knownCost <= minPendingCost) {
        settledSet.add(id)
        const n = nodeById.get(id)
        if (!n) continue

        const reason = minPendingCost === Infinity
          ? `${n.label} confirmed at cost ${knownCost} — the ${containerWord} is empty, no more paths to explore`
          : `${n.label} confirmed at cost ${knownCost} — cheapest path in the ${containerWord} costs ${minPendingCost}, so ${n.label} cannot be reached for less`

        steps.push(makeCodeStep(2, [15, 16, 17], id, bestParent.get(id) ?? null, knownCost, 'settle', {
          uLabel: n.label,
          cVal: knownCost,
          settleReason: reason,
        }))
      }
    }
  }

  // Line 10: return bestPath if bestPath ≠ [] else no path
  const finalNodeId = bestGoalPath.length > 0 ? bestGoalPath[bestGoalPath.length - 1] : startNodeId
  steps.push(makeCodeStep(10, [18, 19], finalNodeId, null, bestGoalCost === Infinity ? 0 : bestGoalCost, 'discover', {
    uLabel: null,
    cVal: null,
  }))

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

