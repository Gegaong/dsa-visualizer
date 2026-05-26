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
// If startNodeId is provided and valid, that node is placed first in the iteration order.
function buildGraphLookups(nodes: GraphNode[], edges: GraphEdge[], startNodeId?: string): GraphLookups {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const rawNeighbors = buildNeighborsMap(nodes, edges)
  const outNeighborsById = new Map<string, string[]>()
  rawNeighbors.forEach((ids, id) => outNeighborsById.set(id, sortIdsByLabel(ids, nodeById)))
  let sortedNodeIds = sortIdsByLabel(nodes.map((node) => node.id), nodeById)
  if (startNodeId && nodeById.has(startNodeId)) {
    sortedNodeIds = [startNodeId, ...sortedNodeIds.filter((id) => id !== startNodeId)]
  }
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

  const labelOf = (id: string) => nodeById.get(id)?.label ?? '?'

  const emitVisit = (nodeId: string, fromNodeId: string | null, explanation: string, frontierNodeIds: string[]) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId, frontierNodeIds, explanation })
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

      const neighbors = outNeighborsById.get(id) ?? []
      const backEdgeTarget = neighbors.find((neighborId) => inStack.has(neighborId))
      if (backEdgeTarget !== undefined) {
        const frontierNodeIds = [...new Set(frames.filter(f => f.phase === 'enter' && !globalVisited.has(f.id)).map(f => f.id))]
        emitVisit(id, frame.parentId, `Back edge detected: ${labelOf(id)} → ${labelOf(backEdgeTarget)} leads to a node still on the active DFS path (inStack). In a DFS tree, a back edge always means a directed cycle — the cycle is the portion of the stack from ${labelOf(backEdgeTarget)} down to here.`, frontierNodeIds)
        return { steps, cycleNodeIds: pathStack.slice(pathStack.indexOf(backEdgeTarget)) }
      }

      const unseenLabels = neighbors
        .filter((nid) => !globalVisited.has(nid))
        .map(labelOf)
      const neighborSentence = unseenLabels.length === 0
        ? `No unvisited out-neighbors here — this branch ends, moving to the next node.`
        : `Pushing ${unseenLabels.join(', ')} — each will be checked for back edges when entered.`
      const inStackNote = frame.parentId === null
        ? `The 'inStack' set now tracks the active path. Any edge pointing back into it is a cycle witness.`
        : `Added to inStack. Any out-edge from here to an inStack node is a back edge → cycle.`

      frames.push({ id, phase: 'exit', parentId: null })

      // Push unvisited neighbors in reverse so the smallest-label one is entered first.
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        const neighborId = neighbors[i]
        if (!globalVisited.has(neighborId)) {
          frames.push({ id: neighborId, phase: 'enter', parentId: id })
        }
      }

      const frontierNodeIds = [...new Set(frames.filter(f => f.phase === 'enter' && !globalVisited.has(f.id)).map(f => f.id))]
      emitVisit(id, frame.parentId, `${inStackNote} ${neighborSentence}`, frontierNodeIds)
    }
  }

  // Update final step's explanation if algorithm terminated without finding a cycle
  if (steps.length > 0) {
    const lastStep = steps[steps.length - 1]
    if (lastStep.explanation && lastStep.explanation.includes('Pushing')) {
      lastStep.explanation = `Popped ${lastStep.nodeLabel}. Stack is empty — no cycle found.`
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

// BFS approach: Kahn's algorithm (repeatedly remove in-degree-0 nodes; queue, label-tie-broken).
// Visit steps are the removal order; any node that never gets removed sits behind a cycle.
// When a cycle exists, one cycle is reconstructed from the leftovers and its nodes are appended
// as the final visit steps — that is all we report, so the walk stops there.
function detectCycleBfs(lookups: GraphLookups): DetectionOutcome {
  const { nodeById, outNeighborsById, sortedNodeIds } = lookups

  const labelOf = (id: string) => nodeById.get(id)?.label ?? '?'

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

  const emitVisit = (nodeId: string, fromNodeId: string | null, explanation: string, frontierNodeIds: string[]) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId, frontierNodeIds, explanation })
    order += 1
  }

  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined) continue
    removed.add(id)
    const droppedTo0: string[] = []
    for (const neighborId of outNeighborsById.get(id) ?? []) {
      const next = (inDegree.get(neighborId) ?? 0) - 1
      inDegree.set(neighborId, next)
      if (next === 0) {
        if (!parentById.has(neighborId)) {
          parentById.set(neighborId, id)
        }
        queue.push(neighborId)
        droppedTo0.push(labelOf(neighborId))
      }
    }
    const isFirst = removed.size === 1
    const nodeLabel = labelOf(id)
    const outNeighbors = outNeighborsById.get(id) ?? []
    const enqueueNote = droppedTo0.length === 0
      ? `No neighbor reached in-degree 0.`
      : `${droppedTo0.join(', ')} ${droppedTo0.length === 1 ? 'is' : 'are'} now in-degree 0 — added to the queue.`
    let explanation: string
    if (isFirst) {
      explanation = outNeighbors.length === 0
        ? `${nodeLabel} has in-degree 0 and no out-edges — removed. Kahn's works by repeatedly removing in-degree-0 nodes; any node that never reaches 0 is stuck in a cycle. No neighbors to decrement.`
        : `${nodeLabel} has in-degree 0 — removed first. Kahn's works by repeatedly removing in-degree-0 nodes; any node that never reaches 0 is stuck in a cycle. Decrementing out-neighbors' in-degrees. ${enqueueNote}`
    } else {
      explanation = outNeighbors.length === 0
        ? `Removed ${nodeLabel} (in-degree 0, no out-edges). ${enqueueNote}`
        : `Removed ${nodeLabel} (in-degree 0). Decrementing out-neighbors' in-degrees. ${enqueueNote}`
    }
    emitVisit(id, parentById.get(id) ?? null, explanation, [...queue])
  }

  if (removed.size === sortedNodeIds.length) {
    return { steps, cycleNodeIds: [] }
  }

  const leftover = new Set(sortedNodeIds.filter((id) => !removed.has(id)))
  const cycleNodeIds = extractCycleFromLeftovers(leftover, outNeighborsById, nodeById)
  if (cycleNodeIds.length > 0) {
    cycleNodeIds.forEach((id, index) => {
      const parentIndex = (index - 1 + cycleNodeIds.length) % cycleNodeIds.length
      const reconstructionNote = index === 0
        ? `Every remaining node had in-degree > 0 — each depends on another remaining node, forming a loop. Walking predecessor edges backward to find where the cycle closes.`
        : `Tracing the cycle: this edge exists in the original graph. The cycle closes when the walk revisits a node already seen.`
      emitVisit(id, cycleNodeIds[parentIndex], reconstructionNote, [])
    })
  }
  return { steps, cycleNodeIds }
}

// Detects whether the directed graph contains a cycle, producing playback steps for the
// chosen strategy plus (if found) one concrete cycle. Bidirectional edges count as 2-cycles.
// startNodeId is optional — when given, traversal begins from that node instead of the default order.
export function runCycleDetection(
  nodes: GraphNode[],
  edges: GraphEdge[],
  strategy: TraversalStrategy,
  startNodeId?: string,
): CycleDetectionResult {
  if (nodes.length === 0) {
    return { steps: [], hasCycle: false, cycleNodeIds: [] }
  }

  const lookups = buildGraphLookups(nodes, edges, startNodeId)
  const outcome = strategy === 'dfs' ? detectCycleDfs(lookups) : detectCycleBfs(lookups)

  return {
    steps: outcome.steps,
    hasCycle: outcome.cycleNodeIds.length > 0,
    cycleNodeIds: outcome.cycleNodeIds,
  }
}
