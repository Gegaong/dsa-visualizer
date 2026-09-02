import type { GraphEdge, GraphNode } from '../../types'

import type { PriorityPathResult, PriorityPathStep } from './algorithmTypes'

import { buildWeightedLookups } from './graphAdjacency'

import { formatCost } from '../../utils/format'

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
    operationCount: 0,
  }

  if (nodes.length === 0) return empty

  const { nodeById, outNeighborsById, directedEdgeMap } = buildWeightedLookups(nodes, edges)
  const startNode = nodeById.get(startNodeId)
  const goalNode = nodeById.get(goalNodeId)
  if (!startNode || !goalNode) return empty

  const steps: PriorityPathStep[] = []
  let order = 1
  let operationCount = 0

  const bestGCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settled = new Set<string>()
  // Greedy ignores path cost, so it can't "relax" — it queues each node the first time
  // it is reached. Dijkstra / A* instead re-queue whenever a cheaper path appears.
  const isGreedy = algorithmLabel === 'Greedy'

  const startH = heuristicFn(startNode, goalNode)
  const startPriority = priorityFn(0, startH)
  operationCount++  // initial PQ push (Rule 3: structure mutation)
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
    operationCount++  // PQ pop (Rule 3: structure mutation)
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
      })
    }

    if (nodeId === goalNodeId) break

    for (const neighborId of outNeighborsById.get(nodeId) ?? []) {
      operationCount++  // edge examination (E term)
      if (settled.has(neighborId)) continue

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const newG = gCost + (edgeInfo?.weight ?? 1)

      // Greedy: queue a node the first time it is reached (h-driven, cost ignored).
      // Dijkstra / A*: relax — queue only when this path beats the best known cost.
      const shouldQueue = isGreedy
        ? !bestParent.has(neighborId)
        : newG < (bestGCost.get(neighborId) ?? Infinity)
      if (shouldQueue) {
        bestGCost.set(neighborId, newG)
        bestParent.set(neighborId, nodeId)

        const neighborNode = nodeById.get(neighborId)!
        const newH = heuristicFn(neighborNode, goalNode)
        const newPriority = priorityFn(newG, newH)

        pq.push({ nodeId: neighborId, gCost: newG, priority: newPriority, fromNodeId: nodeId })
        operationCount++  // PQ push (Rule 3: structure mutation)

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
    heuristicAdmissible,
    operationCount,
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

export function runPriorityPathfindingCode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  algorithm: 'dijkstra' | 'astar' | 'greedy',
  pixelsPerUnit: number,
): PriorityPathResult {
  const heuristicAdmissible = algorithm === 'astar' ? checkAdmissibility(nodes, edges, pixelsPerUnit) : (algorithm === 'dijkstra')
  const empty: PriorityPathResult = {
    kind: 'priority',
    steps: [],
    pathNodeIds: [],
    startNodeId,
    goalNodeId,
    pathFound: false,
    pathCost: null,
    heuristicAdmissible,
    operationCount: 0,
  }

  if (nodes.length === 0) return empty

  const { nodeById, outNeighborsById, directedEdgeMap } = buildWeightedLookups(nodes, edges)
  const startNode = nodeById.get(startNodeId)
  const goalNode = nodeById.get(goalNodeId)
  if (!startNode || !goalNode) return empty

  const isGreedy = algorithm === 'greedy'
  const isAStar = algorithm === 'astar'
  const isDijkstra = algorithm === 'dijkstra'
  const algoLabel = isDijkstra ? 'Dijkstra' : isAStar ? 'A*' : 'Greedy'

  const heuristicFn = (n: GraphNode) => {
    if (isDijkstra) return 0
    return euclideanDistance(n, goalNode, pixelsPerUnit)
  }

  const priorityFn = (g: number, h: number) => {
    if (isGreedy) return h
    if (isAStar) return g + h
    return g
  }

  const steps: PriorityPathStep[] = []
  let order = 1
  let operationCount = 0

  const bestGCost = new Map<string, number>([[startNodeId, 0]])
  const bestParent = new Map<string, string | null>([[startNodeId, null]])
  const settled = new Set<string>()

  const startH = heuristicFn(startNode)
  const startPriority = priorityFn(0, startH)
  const pq: PQItem[] = [{ nodeId: startNodeId, gCost: 0, priority: startPriority, fromNodeId: null }]
  operationCount++

  const getPQLabels = () => {
    return [...pq]
      .sort((a, b) => a.priority - b.priority)
      .map(item => nodeById.get(item.nodeId)?.label ?? item.nodeId)
  }

  const getCostMap = () => {
    const map: Record<string, number> = {}
    for (const [id, c] of bestGCost.entries()) {
      const lbl = nodeById.get(id)?.label ?? id
      map[lbl] = c
    }
    return map
  }

  const getVisitedLabels = () => {
    return [...settled].map(id => nodeById.get(id)?.label ?? id)
  }

  // Line 0: Function signature
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
    queueSizeAfter: 1,
    codeLine: 0,
    logicLines: [0, 1],
    uLabel: null,
    dVal: null,
    gVal: null,
    hVal: null,
    fVal: null,
    nbLabel: null,
    newDistVal: null,
    newGVal: null,
    pqLabels: [],
    costMap: {},
    visitedLabels: [],
  })

  // Line 1: Initialize data structures
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
    queueSizeAfter: 1,
    codeLine: 1,
    logicLines: [0, 1],
    uLabel: null,
    dVal: isDijkstra ? 0 : null,
    gVal: isAStar ? 0 : null,
    hVal: isGreedy ? startH : (isAStar ? startH : null),
    fVal: isAStar ? startPriority : null,
    nbLabel: null,
    newDistVal: null,
    newGVal: null,
    pqLabels: [startNode.label],
    costMap: { [startNode.label]: 0 },
    visitedLabels: [],
  })

  let goalReached = false

  while (pq.length > 0) {
    // Line 2: while pq != empty check
    steps.push({
      nodeId: startNodeId,
      nodeLabel: startNode.label,
      order: order++,
      fromNodeId: null,
      fromNodeLabel: null,
      edgeWeight: null,
      gCost: 0,
      hCost: 0,
      priority: 0,
      eventType: 'discover',
      queueSizeAfter: pq.length,
      codeLine: 2,
      logicLines: [0, 1],
      uLabel: null,
      dVal: null,
      gVal: null,
      hVal: null,
      fVal: null,
      nbLabel: null,
      newDistVal: null,
      newGVal: null,
      pqLabels: getPQLabels(),
      costMap: getCostMap(),
      visitedLabels: getVisitedLabels(),
    })

    const item = popMin(pq)
    operationCount++
    const { nodeId, gCost, priority, fromNodeId } = item
    const uNode = nodeById.get(nodeId)!
    const uLabel = uNode.label
    const hCost = heuristicFn(uNode)

    const isStale = settled.has(nodeId) || (gCost > (bestGCost.get(nodeId) ?? Infinity))

    // Line 3: popMin & stale check
    steps.push({
      nodeId,
      nodeLabel: uLabel,
      order: order++,
      fromNodeId,
      fromNodeLabel: fromNodeId ? (nodeById.get(fromNodeId)?.label ?? null) : null,
      edgeWeight: null,
      gCost,
      hCost,
      priority,
      eventType: 'discover',
      queueSizeAfter: pq.length,
      codeLine: 3,
      logicLines: [4, 5, 6],
      uLabel,
      dVal: isDijkstra ? gCost : null,
      gVal: isAStar ? gCost : null,
      hVal: hCost,
      fVal: isAStar ? priority : null,
      nbLabel: null,
      newDistVal: null,
      newGVal: null,
      pqLabels: getPQLabels(),
      costMap: getCostMap(),
      visitedLabels: getVisitedLabels(),
    })

    if (isStale) {
      continue
    }

    settled.add(nodeId)
    const isAssumed = (algorithm === 'greedy') || (algorithm === 'astar' && !heuristicAdmissible)
    const settleReason = isAssumed
      ? `${uLabel} committed — cost ${formatCost(gCost)} assumed as best so far · ${algoLabel}`
      : `${uLabel} confirmed — cost ${formatCost(gCost)} is optimal (lowest cost among all unconfirmed nodes) · ${algoLabel}`

    // Line 4: Settle node & goal check
    steps.push({
      nodeId,
      nodeLabel: uLabel,
      order: order++,
      fromNodeId: bestParent.get(nodeId) ?? null,
      fromNodeLabel: bestParent.get(nodeId) ? (nodeById.get(bestParent.get(nodeId)!)?.label ?? null) : null,
      edgeWeight: null,
      gCost,
      hCost,
      priority,
      eventType: isAssumed ? 'assumed' : 'settle',
      queueSizeAfter: pq.length,
      settleReason,
      codeLine: 4,
      logicLines: [7, 8],
      uLabel,
      dVal: isDijkstra ? gCost : null,
      gVal: isAStar ? gCost : null,
      hVal: hCost,
      fVal: isAStar ? priority : null,
      nbLabel: null,
      newDistVal: null,
      newGVal: null,
      pqLabels: getPQLabels(),
      costMap: getCostMap(),
      visitedLabels: getVisitedLabels(),
    })

    if (nodeId === goalNodeId) {
      goalReached = true
      break
    }

    const neighbors = outNeighborsById.get(nodeId) ?? []
    for (const neighborId of neighbors) {
      operationCount++
      const neighborNode = nodeById.get(neighborId)!
      const nbLabel = neighborNode.label

      if (settled.has(neighborId)) {
        continue
      }

      const edgeInfo = directedEdgeMap.get(`${nodeId}:${neighborId}`)
      const weight = edgeInfo?.weight ?? 1
      const newG = gCost + weight
      const newH = heuristicFn(neighborNode)
      const newPriority = priorityFn(newG, newH)

      // Line 5: for each neighbor loop header
      steps.push({
        nodeId: neighborId,
        nodeLabel: nbLabel,
        order: order++,
        fromNodeId: nodeId,
        fromNodeLabel: uLabel,
        edgeWeight: weight,
        gCost: newG,
        hCost: newH,
        priority: newPriority,
        eventType: 'discover',
        queueSizeAfter: pq.length,
        codeLine: 5,
        logicLines: [9, 10, 11],
        uLabel,
        dVal: isDijkstra ? gCost : null,
        gVal: isAStar ? gCost : null,
        hVal: hCost,
        fVal: isAStar ? priority : null,
        nbLabel,
        newDistVal: isDijkstra ? newG : null,
        newGVal: isAStar ? newG : null,
        pqLabels: getPQLabels(),
        costMap: getCostMap(),
        visitedLabels: getVisitedLabels(),
      })

      if (isGreedy) {
        // Greedy Line 6: if nb not in prev
        const isNotSeen = !bestParent.has(neighborId)
        steps.push({
          nodeId: neighborId,
          nodeLabel: nbLabel,
          order: order++,
          fromNodeId: nodeId,
          fromNodeLabel: uLabel,
          edgeWeight: weight,
          gCost: newG,
          hCost: newH,
          priority: newPriority,
          eventType: 'discover',
          queueSizeAfter: pq.length,
          codeLine: 6,
          logicLines: [9, 10, 11],
          uLabel,
          dVal: null,
          gVal: null,
          hVal: newH,
          fVal: null,
          nbLabel,
          newDistVal: null,
          newGVal: null,
          pqLabels: getPQLabels(),
          costMap: getCostMap(),
          visitedLabels: getVisitedLabels(),
        })

        if (isNotSeen) {
          bestGCost.set(neighborId, newG)
          bestParent.set(neighborId, nodeId)
          pq.push({ nodeId: neighborId, gCost: newG, priority: newPriority, fromNodeId: nodeId })
          operationCount++

          // Greedy Line 7: prev[nb] <- u; pq.push((h(nb), nb))
          steps.push({
            nodeId: neighborId,
            nodeLabel: nbLabel,
            order: order++,
            fromNodeId: nodeId,
            fromNodeLabel: uLabel,
            edgeWeight: weight,
            gCost: newG,
            hCost: newH,
            priority: newPriority,
            eventType: 'discover',
            queueSizeAfter: pq.length,
            codeLine: 7,
            logicLines: [9, 10, 11],
            uLabel,
            dVal: null,
            gVal: null,
            hVal: newH,
            fVal: null,
            nbLabel,
            newDistVal: null,
            newGVal: null,
            pqLabels: getPQLabels(),
            costMap: getCostMap(),
            visitedLabels: getVisitedLabels(),
          })
        }
      } else {
        // Dijkstra / A*
        // Line 6: newDist / newG calculation
        steps.push({
          nodeId: neighborId,
          nodeLabel: nbLabel,
          order: order++,
          fromNodeId: nodeId,
          fromNodeLabel: uLabel,
          edgeWeight: weight,
          gCost: newG,
          hCost: newH,
          priority: newPriority,
          eventType: 'discover',
          queueSizeAfter: pq.length,
          codeLine: 6,
          logicLines: [9, 10, 11],
          uLabel,
          dVal: isDijkstra ? gCost : null,
          gVal: isAStar ? gCost : null,
          hVal: hCost,
          fVal: isAStar ? priority : null,
          nbLabel,
          newDistVal: isDijkstra ? newG : null,
          newGVal: isAStar ? newG : null,
          pqLabels: getPQLabels(),
          costMap: getCostMap(),
          visitedLabels: getVisitedLabels(),
        })

        // Line 7: if newDist / newG < dist/g[nb] check
        const isBetter = newG < (bestGCost.get(neighborId) ?? Infinity)
        steps.push({
          nodeId: neighborId,
          nodeLabel: nbLabel,
          order: order++,
          fromNodeId: nodeId,
          fromNodeLabel: uLabel,
          edgeWeight: weight,
          gCost: newG,
          hCost: newH,
          priority: newPriority,
          eventType: 'discover',
          queueSizeAfter: pq.length,
          codeLine: 7,
          logicLines: [9, 10, 11],
          uLabel,
          dVal: isDijkstra ? gCost : null,
          gVal: isAStar ? gCost : null,
          hVal: hCost,
          fVal: isAStar ? priority : null,
          nbLabel,
          newDistVal: isDijkstra ? newG : null,
          newGVal: isAStar ? newG : null,
          pqLabels: getPQLabels(),
          costMap: getCostMap(),
          visitedLabels: getVisitedLabels(),
        })

        if (isBetter) {
          bestGCost.set(neighborId, newG)
          bestParent.set(neighborId, nodeId)
          pq.push({ nodeId: neighborId, gCost: newG, priority: newPriority, fromNodeId: nodeId })
          operationCount++

          // Line 8: update dist/g and push to PQ
          steps.push({
            nodeId: neighborId,
            nodeLabel: nbLabel,
            order: order++,
            fromNodeId: nodeId,
            fromNodeLabel: uLabel,
            edgeWeight: weight,
            gCost: newG,
            hCost: newH,
            priority: newPriority,
            eventType: 'discover',
            queueSizeAfter: pq.length,
            codeLine: 8,
            logicLines: [9, 10, 11],
            uLabel,
            dVal: isDijkstra ? gCost : null,
            gVal: isAStar ? gCost : null,
            hVal: hCost,
            fVal: isAStar ? priority : null,
            nbLabel,
            newDistVal: isDijkstra ? newG : null,
            newGVal: isAStar ? newG : null,
            pqLabels: getPQLabels(),
            costMap: getCostMap(),
            visitedLabels: getVisitedLabels(),
          })
        }
      }
    }
  }

  // If no path was found, emit terminal Line 9 (or Line 8 for Greedy)
  if (!goalReached) {
    const returnLine = isGreedy ? 8 : 9
    steps.push({
      nodeId: startNodeId,
      nodeLabel: startNode.label,
      order,
      fromNodeId: null,
      fromNodeLabel: null,
      edgeWeight: null,
      gCost: 0,
      hCost: 0,
      priority: 0,
      eventType: 'discover',
      queueSizeAfter: 0,
      codeLine: returnLine,
      logicLines: [17, 18],
      uLabel: null,
      dVal: null,
      gVal: null,
      hVal: null,
      fVal: null,
      nbLabel: null,
      newDistVal: null,
      newGVal: null,
      pqLabels: [],
      costMap: getCostMap(),
      visitedLabels: getVisitedLabels(),
    })
  }

  // Walk bestParent back from goal to reconstruct the path
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
    operationCount,
  }
}

export function runDijkstraCode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
): PriorityPathResult {
  return runPriorityPathfindingCode(nodes, edges, startNodeId, goalNodeId, 'dijkstra', 1)
}

export function runAStarCode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  pixelsPerUnit: number,
): PriorityPathResult {
  return runPriorityPathfindingCode(nodes, edges, startNodeId, goalNodeId, 'astar', pixelsPerUnit)
}

export function runGreedyCode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  pixelsPerUnit: number,
): PriorityPathResult {
  return runPriorityPathfindingCode(nodes, edges, startNodeId, goalNodeId, 'greedy', pixelsPerUnit)
}
