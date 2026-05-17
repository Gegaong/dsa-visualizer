import type { GraphEdge, GraphNode } from '../types'

import type {
  CycleDetectionResult,
  CycleDetectionStep,
  TraversalStrategy,
} from './algorithmstypes'

import { buildNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

type GraphLookups = {
  nodeById: Map<string, GraphNode>
  // Directed out-neighbors per node, each list sorted by visible label (deterministic playback).
  outNeighborsById: Map<string, string[]>
  // Every node id, sorted by visible label.
  sortedNodeIds: string[]
}

// Pre-builds sorted neighbor and node-id maps used by both DFS and BFS detection.
function buildGraphLookups(nodes: GraphNode[], edges: GraphEdge[]): GraphLookups {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const rawNeighbors = buildNeighborsMap(nodes, edges)
  const outNeighborsById = new Map<string, string[]>()
  rawNeighbors.forEach((ids, id) => outNeighborsById.set(id, sortIdsByLabel(ids, nodeById)))
  const sortedNodeIds = sortIdsByLabel(
    nodes.map((node) => node.id),
    nodeById,
  )
  return { nodeById, outNeighborsById, sortedNodeIds }
}

type DetectionOutcome = {
  steps: CycleDetectionStep[]
  cycleNodeIds: string[]
}

// DFS approach: iterative depth-first search with per-path "in stack" tracking.
// A neighbor that is still on the active DFS path is a back edge → directed cycle;
// the cycle is the slice of the path from that neighbor down to the current node.
// Visit steps are emitted in DFS pre-order; the walk stops as soon as a cycle is found.
function detectCycleDfs(lookups: GraphLookups): DetectionOutcome {
  const { nodeById, outNeighborsById, sortedNodeIds } = lookups
  const globalVisited = new Set<string>()
  const steps: CycleDetectionStep[] = []
  let order = 1

  const emitVisit = (nodeId: string, fromNodeId: string | null) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId })
    order += 1
  }

  for (const rootId of sortedNodeIds) {
    if (globalVisited.has(rootId)) continue

    const inStack = new Set<string>()
    const pathStack: string[] = []
    // Each frame is either an "enter" (descend into a node) or an "exit" (pop it back off the path).
    const frames: Array<{ id: string; phase: 'enter' | 'exit'; parentId: string | null }> = [
      { id: rootId, phase: 'enter', parentId: null },
    ]

    while (frames.length > 0) {
      const frame = frames.pop()
      if (!frame) continue
      const { id, phase } = frame

      if (phase === 'exit') {
        inStack.delete(id)
        pathStack.pop()
        continue
      }

      if (globalVisited.has(id)) continue
      globalVisited.add(id)
      inStack.add(id)
      pathStack.push(id)
      emitVisit(id, frame.parentId)
      frames.push({ id, phase: 'exit', parentId: null })

      const neighbors = outNeighborsById.get(id) ?? []
      const backEdgeTarget = neighbors.find((neighborId) => inStack.has(neighborId))
      if (backEdgeTarget !== undefined) {
        return { steps, cycleNodeIds: pathStack.slice(pathStack.indexOf(backEdgeTarget)) }
      }
      // Push unvisited neighbors in reverse so the smallest-label one is entered first.
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        const neighborId = neighbors[i]
        if (!globalVisited.has(neighborId)) {
          frames.push({ id: neighborId, phase: 'enter', parentId: id })
        }
      }
    }
  }

  return { steps, cycleNodeIds: [] }
}

// Reconstructs one cycle from Kahn's leftovers (nodes whose in-degree never reached 0).
// Every leftover has at least one leftover predecessor (that is *why* its in-degree stayed
// positive), so walking predecessors can never get stuck and must revisit a node → the cycle.
function extractCycleFromLeftovers(
  leftover: Set<string>,
  outNeighborsById: Map<string, string[]>,
  nodeById: Map<string, GraphNode>,
): string[] {
  if (leftover.size === 0) return []

  // Predecessors-within-leftover per leftover node, sorted by label.
  const leftoverPredecessors = new Map<string, string[]>()
  leftover.forEach((id) => leftoverPredecessors.set(id, []))
  leftover.forEach((id) => {
    for (const neighborId of outNeighborsById.get(id) ?? []) {
      if (leftover.has(neighborId)) leftoverPredecessors.get(neighborId)?.push(id)
    }
  })
  leftoverPredecessors.forEach((preds, id) =>
    leftoverPredecessors.set(id, sortIdsByLabel(preds, nodeById)),
  )

  const start = sortIdsByLabel([...leftover], nodeById)[0]
  const backwardWalk: string[] = []
  const positionOnWalk = new Map<string, number>()
  let current = start
  while (!positionOnWalk.has(current)) {
    positionOnWalk.set(current, backwardWalk.length)
    backwardWalk.push(current)
    current = (leftoverPredecessors.get(current) ?? [])[0]
  }

  // backwardWalk from `current` onward is the cycle read against edge direction
  // ([c, p1, p2, ...] with edges p1→c, p2→p1, ...). Reverse the tail to get forward order.
  const cycleStart = positionOnWalk.get(current) ?? 0
  const reversedCycle = backwardWalk.slice(cycleStart)
  return [reversedCycle[0], ...reversedCycle.slice(1).reverse()]
}

// BFS approach: Kahn's algorithm (repeatedly remove in-degree-0 nodes; FIFO queue, label-tie-broken).
// Visit steps are the removal order; any node that never gets removed sits behind a cycle.
// When a cycle exists, one cycle is reconstructed from the leftovers and its nodes are appended
// as the final visit steps — that is all we report, so the walk stops there.
function detectCycleBfs(lookups: GraphLookups): DetectionOutcome {
  const { nodeById, outNeighborsById, sortedNodeIds } = lookups

  const inDegree = new Map<string, number>()
  sortedNodeIds.forEach((id) => inDegree.set(id, 0))
  outNeighborsById.forEach((neighbors) => {
    neighbors.forEach((neighborId) => {
      inDegree.set(neighborId, (inDegree.get(neighborId) ?? 0) + 1)
    })
  })

  const queue: string[] = sortedNodeIds.filter((id) => (inDegree.get(id) ?? 0) === 0)
  const parentById = new Map<string, string | null>()
  const removed = new Set<string>()
  const steps: CycleDetectionStep[] = []
  let order = 1

  const emitVisit = (nodeId: string, fromNodeId: string | null) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId })
    order += 1
  }

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) continue
    removed.add(id)
    emitVisit(id, parentById.get(id) ?? null)
    for (const neighborId of outNeighborsById.get(id) ?? []) {
      const next = (inDegree.get(neighborId) ?? 0) - 1
      inDegree.set(neighborId, next)
      if (next === 0) {
        if (!parentById.has(neighborId)) {
          parentById.set(neighborId, id)
        }
        queue.push(neighborId)
      }
    }
  }

  if (removed.size === sortedNodeIds.length) {
    return { steps, cycleNodeIds: [] }
  }

  const leftover = new Set(sortedNodeIds.filter((id) => !removed.has(id)))
  const cycleNodeIds = extractCycleFromLeftovers(leftover, outNeighborsById, nodeById)
  if (cycleNodeIds.length > 0) {
    cycleNodeIds.forEach((id, index) => {
      const parentIndex = (index - 1 + cycleNodeIds.length) % cycleNodeIds.length
      emitVisit(id, cycleNodeIds[parentIndex])
    })
  }
  return { steps, cycleNodeIds }
}

// Detects whether the directed graph contains a cycle, producing playback steps for the
// chosen strategy plus (if found) one concrete cycle. Bidirectional edges count as 2-cycles.
export function runCycleDetection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  strategy: TraversalStrategy,
): CycleDetectionResult {
  if (nodes.length === 0) {
    return { steps: [], hasCycle: false, cycleNodeIds: [] }
  }

  const lookups = buildGraphLookups(nodes, edges)
  const outcome = strategy === 'dfs' ? detectCycleDfs(lookups) : detectCycleBfs(lookups)

  return {
    steps: outcome.steps,
    hasCycle: outcome.cycleNodeIds.length > 0,
    cycleNodeIds: outcome.cycleNodeIds,
  }
}
