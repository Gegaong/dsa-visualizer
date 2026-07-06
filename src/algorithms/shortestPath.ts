import type { GraphEdge, GraphNode } from '../types'

import type {
  ShortestPathResult,
  ShortestPathStep,
  TraversalStrategy,
} from './algorithmTypes'

import { buildNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

type GraphLookups = {
  nodeById: Map<string, GraphNode>
  outNeighborsById: Map<string, string[]>
}

// Pre-builds sorted neighbor and node-id maps used by both BFS and DFS traversals.
function buildGraphLookups(nodes: GraphNode[], edges: GraphEdge[]): GraphLookups {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const rawNeighbors = buildNeighborsMap(nodes, edges)
  const outNeighborsById = new Map<string, string[]>()
  rawNeighbors.forEach((ids, id) => outNeighborsById.set(id, sortIdsByLabel(ids, nodeById)))
  return { nodeById, outNeighborsById }
}

// Walks the parentById chain backward from goalId to startId, producing the path in start→goal order.
function reconstructPath(
  parentById: Map<string, string | null>,
  startId: string,
  goalId: string,
): string[] {
  const path: string[] = []
  let current: string | null = goalId
  while (current !== null) {
    path.unshift(current)
    if (current === startId) return path
    current = parentById.get(current) ?? null
  }
  return []
}

type PathOutcome = {
  steps: ShortestPathStep[]
  pathNodeIds: string[]
  operationCount: number
}

// BFS guarantees the shortest path (fewest edges) in an unweighted graph.
// Visits nodes level by level; stops as soon as the goal is dequeued.
function findPathBfs(lookups: GraphLookups, startId: string, goalId: string): PathOutcome {
  const { nodeById, outNeighborsById } = lookups
  const parentById = new Map<string, string | null>([[startId, null]])
  const queue: string[] = [startId]
  const steps: ShortestPathStep[] = []
  let order = 1
  let operationCount = 1  // initial push of start into the queue

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) continue
    operationCount++  // node dequeue (V term)
    const node = nodeById.get(id)
    if (!node) continue
    const parentId = parentById.get(id) ?? null

    if (id === goalId) {
      steps.push({
        nodeId: id,
        nodeLabel: node.label,
        order,
        fromNodeId: parentId,
        frontierNodeIds: [...queue],
      })
      return { steps, pathNodeIds: reconstructPath(parentById, startId, goalId), operationCount }
    }

    const outNeighbors = outNeighborsById.get(id) ?? []
    const enqueuedNodeIds: string[] = []
    for (const neighborId of outNeighbors) {
      operationCount++  // edge examination (E term)
      if (!parentById.has(neighborId)) {
        parentById.set(neighborId, id)
        queue.push(neighborId)
        operationCount++  // frontier push
        enqueuedNodeIds.push(neighborId)
      }
    }
    steps.push({
      nodeId: id,
      nodeLabel: node.label,
      order,
      fromNodeId: parentId,
      frontierNodeIds: [...queue],
      enqueuedNodeIds,
    })
    order += 1
  }

  return { steps, pathNodeIds: [], operationCount }
}

// DFS exhaustively explores every acyclic path via backtracking and returns the shortest
// (fewest edges). A node can be revisited across different branches but not within the same
// path (inPath guards against cycles). Prunes branches that can no longer beat the current best.
function findPathDfs(lookups: GraphLookups, startId: string, goalId: string): PathOutcome {
  const { nodeById, outNeighborsById } = lookups
  const steps: ShortestPathStep[] = []
  let order = 1
  let bestPath: string[] = []
  let operationCount = 0

  function dfs(currentId: string, fromId: string | null, currentPath: string[], inPath: Set<string>): void {
    operationCount++  // node entry (V term)
    const node = nodeById.get(currentId)
    if (!node) return
    if (currentId === goalId) {
      const improved = bestPath.length === 0 || currentPath.length < bestPath.length
      if (improved) bestPath = [...currentPath]
      steps.push({
        nodeId: currentId,
        nodeLabel: node.label,
        order,
        fromNodeId: fromId,
        dfsBestPathLength: bestPath.length - 1,
        frontierNodeIds: [],
      })
      order += 1
      return
    }
    const dfsBest = bestPath.length > 0 ? bestPath.length - 1 : null
    steps.push({
      nodeId: currentId,
      nodeLabel: node.label,
      order,
      fromNodeId: fromId,
      dfsBestPathLength: dfsBest,
      frontierNodeIds: [],
    })
    order += 1
    // Even reaching goal in one more step can't improve best — prune.
    if (bestPath.length > 0 && currentPath.length + 1 >= bestPath.length) return
    const dfsNeighbors = outNeighborsById.get(currentId) ?? []
    for (const neighborId of dfsNeighbors) {
      operationCount++  // edge examination (E term)
      if (!inPath.has(neighborId)) {
        currentPath.push(neighborId)
        inPath.add(neighborId)
        dfs(neighborId, currentId, currentPath, inPath)
        currentPath.pop()
        inPath.delete(neighborId)
      }
    }
  }

  const initialPath = [startId]
  const inPath = new Set([startId])
  dfs(startId, null, initialPath, inPath)

  return { steps, pathNodeIds: bestPath, operationCount }
}

// Finds a path from startNodeId to goalNodeId using the chosen strategy.
// BFS guarantees shortest path; DFS exhaustively backtracks to find the true shortest path.
export function runShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  goalNodeId: string,
  strategy: TraversalStrategy,
): ShortestPathResult {
  if (nodes.length === 0) {
    return { steps: [], pathNodeIds: [], startNodeId, goalNodeId, pathFound: false, operationCount: 0 }
  }

  const lookups = buildGraphLookups(nodes, edges)

  // If start === goal, report a trivial zero-edge path without traversal steps.
  if (startNodeId === goalNodeId) {
    const node = lookups.nodeById.get(startNodeId)
    const trivialStep: ShortestPathStep = {
      nodeId: startNodeId,
      nodeLabel: node?.label ?? '',
      order: 1,
      fromNodeId: null,
      frontierNodeIds: [],
    }
    return {
      steps: [trivialStep],
      pathNodeIds: [startNodeId],
      startNodeId,
      goalNodeId,
      pathFound: true,
      operationCount: 0,
    }
  }

  const outcome = strategy === 'dfs'
    ? findPathDfs(lookups, startNodeId, goalNodeId)
    : findPathBfs(lookups, startNodeId, goalNodeId)

  return {
    steps: outcome.steps,
    pathNodeIds: outcome.pathNodeIds,
    startNodeId,
    goalNodeId,
    pathFound: outcome.pathNodeIds.length > 0,
    operationCount: outcome.operationCount,
  }
}
