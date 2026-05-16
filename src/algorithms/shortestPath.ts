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
  const parentById = new Map<string, string | null>([[startId, null]])
  const queue: string[] = [startId]
  const steps: ShortestPathStep[] = []
  let order = 1

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) continue
    const node = nodeById.get(id)
    if (!node) continue
    steps.push({ nodeId: id, nodeLabel: node.label, order, fromNodeId: parentById.get(id) ?? null })
    order += 1
    if (id === goalId) return { steps, pathNodeIds: reconstructPath(parentById, startId, goalId) }
    for (const neighborId of outNeighborsById.get(id) ?? []) {
      if (!parentById.has(neighborId)) {
        parentById.set(neighborId, id)
        queue.push(neighborId)
      }
    }
  }

  return { steps, pathNodeIds: [] }
}

// DFS finds the first path discovered by depth-first order, which is not necessarily shortest.
// Iterative with an explicit stack; parent is recorded on first visit only.
function findPathDfs(lookups: GraphLookups, startId: string, goalId: string): PathOutcome {
  const { nodeById, outNeighborsById } = lookups
  const parentById = new Map<string, string | null>()
  const visited = new Set<string>()
  const stack: Array<{ id: string; fromId: string | null }> = [{ id: startId, fromId: null }]
  const steps: ShortestPathStep[] = []
  let order = 1

  while (stack.length > 0) {
    const frame = stack.pop()
    if (!frame || visited.has(frame.id)) continue
    visited.add(frame.id)
    parentById.set(frame.id, frame.fromId)
    const node = nodeById.get(frame.id)
    if (!node) continue
    steps.push({ nodeId: frame.id, nodeLabel: node.label, order, fromNodeId: frame.fromId })
    order += 1
    if (frame.id === goalId) return { steps, pathNodeIds: reconstructPath(parentById, startId, goalId) }
    const neighbors = outNeighborsById.get(frame.id) ?? []
    // Push in reverse so the smallest-label neighbor is explored first.
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const neighborId = neighbors[i]
      if (!visited.has(neighborId)) {
        stack.push({ id: neighborId, fromId: frame.id })
      }
    }
  }

  return { steps, pathNodeIds: [] }
}

// Finds a path from startNodeId to goalNodeId using the chosen strategy.
// BFS guarantees shortest path; DFS finds the first path in depth-first order.
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
