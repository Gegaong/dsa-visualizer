import type { GraphEdge, GraphNode } from '../types'

import type {
  ShortestPathResult,
  ShortestPathStep,
  TraversalStrategy,
} from './algorithmstypes'

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
}

// BFS guarantees the shortest path (fewest edges) in an unweighted graph.
// Visits nodes level by level; stops as soon as the goal is dequeued.
function findPathBfs(lookups: GraphLookups, startId: string, goalId: string): PathOutcome {
  const { nodeById, outNeighborsById } = lookups
  const labelOf = (id: string) => nodeById.get(id)?.label ?? '?'
  const parentById = new Map<string, string | null>([[startId, null]])
  const distance = new Map<string, number>([[startId, 0]])
  const queue: string[] = [startId]
  const steps: ShortestPathStep[] = []
  let order = 1

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) continue
    const node = nodeById.get(id)
    if (!node) continue
    const parentId = parentById.get(id) ?? null
    const myDist = distance.get(id) ?? 0

    if (id === goalId) {
      steps.push({
        nodeId: id,
        nodeLabel: node.label,
        order,
        fromNodeId: parentId,
        frontierNodeIds: [...queue],
        explanation: `BFS processes nodes in non-decreasing distance order. This is the first time the goal was dequeued — by BFS invariant, distance ${myDist} is the minimum possible. Any path arriving later must be at least this long.`,
      })
      return { steps, pathNodeIds: reconstructPath(parentById, startId, goalId) }
    }

    const newlyQueued: string[] = []
    for (const neighborId of outNeighborsById.get(id) ?? []) {
      if (!parentById.has(neighborId)) {
        parentById.set(neighborId, id)
        distance.set(neighborId, myDist + 1)
        queue.push(neighborId)
        newlyQueued.push(labelOf(neighborId))
      }
    }
    const enqueueNote = newlyQueued.length === 0
      ? `No new neighbors — this branch is exhausted.`
      : `First-seen neighbors ${newlyQueued.join(', ')} queued at distance ${myDist + 1} — they will be processed only after all distance-${myDist} nodes are done.`
    const explanation = parentId === null
      ? `Distance 0 by definition. BFS expands level by level — all distance-1 neighbors before distance-2, etc. This ordering guarantees the first dequeue of any node gives its shortest path. ${enqueueNote}`
      : `Queue dequeued ${node.label}. BFS guarantees this is the shortest-edge path to this node — all shorter distances are already settled. ${enqueueNote}`
    steps.push({
      nodeId: id,
      nodeLabel: node.label,
      order,
      fromNodeId: parentId,
      frontierNodeIds: [...queue],
      explanation,
    })
    order += 1
  }

  return { steps, pathNodeIds: [] }
}

// DFS exhaustively explores every acyclic path via backtracking and returns the shortest
// (fewest edges). A node can be revisited across different branches but not within the same
// path (inPath guards against cycles). Prunes branches that can no longer beat the current best.
function findPathDfs(lookups: GraphLookups, startId: string, goalId: string): PathOutcome {
  const { nodeById, outNeighborsById } = lookups
  const labelOf = (id: string) => nodeById.get(id)?.label ?? '?'
  const steps: ShortestPathStep[] = []
  let order = 1
  let bestPath: string[] = []

  function dfs(currentId: string, fromId: string | null, currentPath: string[], inPath: Set<string>): void {
    const node = nodeById.get(currentId)
    if (!node) return
    const lengthHere = currentPath.length - 1
    if (currentId === goalId) {
      const prevBestLen = bestPath.length > 0 ? bestPath.length - 1 : null
      const improved = bestPath.length === 0 || currentPath.length < bestPath.length
      if (improved) bestPath = [...currentPath]
      const bestLenAfter = bestPath.length - 1
      const pathComparison = prevBestLen === null
        ? `First path found: ${lengthHere} edges.`
        : improved
          ? `New shortest: ${lengthHere} edges < ${prevBestLen} edges.`
          : lengthHere === prevBestLen
            ? `Ties current best: ${lengthHere} edges = ${prevBestLen} edges.`
            : `Longer than best: ${lengthHere} edges > ${prevBestLen} edges.`
      steps.push({
        nodeId: currentId,
        nodeLabel: node.label,
        order,
        fromNodeId: fromId,
        dfsBestPathLength: bestLenAfter,
        frontierNodeIds: [],
        explanation: `${pathComparison} DFS continues exploring all remaining branches to ensure this is truly the shortest.`,
      })
      order += 1
      return
    }
    const dfsBest = bestPath.length > 0 ? bestPath.length - 1 : null
    const willPrune = bestPath.length > 0 && currentPath.length + 1 >= bestPath.length
    const candidates = (outNeighborsById.get(currentId) ?? [])
      .filter((nid) => !inPath.has(nid))
      .map(labelOf)
    let explanation: string
    if (fromId === null) {
      const candidatesNote = candidates.length === 0 ? 'No neighbors to explore.' : `Exploring ${candidates.join(', ')} depth-first.`
      explanation = `DFS explores every acyclic path — it may hit the goal quickly but must exhaust all branches to guarantee shortest. Pruning kicks in once a best length is known. ${candidatesNote}`
    } else if (willPrune) {
      explanation = `Pruning: even one more step from here (current depth ${lengthHere}) would tie or exceed the best known path (${dfsBest} edges). No need to descend further.`
    } else {
      const candidatesNote = candidates.length === 0
        ? 'No unvisited neighbors — exploring other branches from the stack.'
        : `Trying ${candidates.join(', ')} next.`
      explanation = `${dfsBest !== null ? `Current best: ${dfsBest} edges — any path ≥ this will be pruned.` : `No best path yet — all branches are explored.`} ${candidatesNote}`
    }
    steps.push({
      nodeId: currentId,
      nodeLabel: node.label,
      order,
      fromNodeId: fromId,
      dfsBestPathLength: dfsBest,
      frontierNodeIds: [],
      explanation,
    })
    order += 1
    // Even reaching goal in one more step can't improve best — prune.
    if (bestPath.length > 0 && currentPath.length + 1 >= bestPath.length) return
    for (const neighborId of outNeighborsById.get(currentId) ?? []) {
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

  return { steps, pathNodeIds: bestPath }
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
    return { steps: [], pathNodeIds: [], startNodeId, goalNodeId, pathFound: false }
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
      explanation: `Start and goal are the same node — path length is 0 by definition, no traversal needed.`,
    }
    return {
      steps: [trivialStep],
      pathNodeIds: [startNodeId],
      startNodeId,
      goalNodeId,
      pathFound: true,
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
  }
}
