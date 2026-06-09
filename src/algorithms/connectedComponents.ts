import type { GraphEdge, GraphNode } from '../types'

import type {
  ConnectedComponentsResult,
  ConnectedComponentsStep,
  TraversalStrategy,
} from './algorithmstypes'

import { buildWeaklyConnectedNeighborsMap } from './graphAdjacency'

import { traverseReachableFrom } from './graphTraversal'

import { sortIdsByLabel } from './sortIdsByLabel'

// Connected components on undirected adjacency (direction ignored); emits playback steps; strategy only changes visit order inside each component.
// startNodeId is optional — when given, traversal begins from that node's component first.
export function runConnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[],
  strategy: TraversalStrategy,
  startNodeId?: string,
): ConnectedComponentsResult {
  if (nodes.length === 0) {
    return {
      steps: [],
      componentCount: 0,
      largestComponentSize: 0,
      components: [],
      operationCount: 0,
    }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const neighborsById = buildWeaklyConnectedNeighborsMap(nodes, edges)
  let sortedRoots = sortIdsByLabel(nodes.map((node) => node.id), nodeById)
  if (startNodeId && nodeById.has(startNodeId)) {
    sortedRoots = [startNodeId, ...sortedRoots.filter((id) => id !== startNodeId)]
  }

  const globalVisited = new Set<string>()
  const components: string[][] = []
  const steps: ConnectedComponentsStep[] = []
  let order = 1
  let operationCount = 0

  // Appends one CC step (with component root) and bumps global step order.
  const emitVisit = (nodeId: string, componentRootId: string, fromNodeId: string | null, frontierNodeIds: string[]) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({
      nodeId: node.id,
      nodeLabel: node.label,
      order,
      componentRootNodeId: componentRootId,
      fromNodeId,
      frontierNodeIds,
    })
    order += 1
  }

  // Neighbor expansion order: sorted by visible label so playback is deterministic.
  const orderNeighbors = (raw: string[]) => sortIdsByLabel(raw, nodeById)

  // Collects one component's node ids in walk order, starting from an unvisited root.
  const exploreFromRoot = (rootId: string) => {
    const componentNodes: string[] = []
    let frontierOrder: string[] = [rootId]
    operationCount++  // initial push of root into the queue/stack

    traverseReachableFrom({
      neighborsById,
      startId: rootId,
      visited: globalVisited,
      strategy,
      orderNeighbors,
      onVisit: (nodeId, parentId) => {
        operationCount++  // node dequeue/pop
        // Sort neighbors by label so the displayed frontier matches the actual visit order.
        const sortedNeighbors = sortIdsByLabel(neighborsById.get(nodeId) ?? [], nodeById)
        operationCount += sortedNeighbors.length  // edge examinations
        const newNeighbors = sortedNeighbors.filter(id => !globalVisited.has(id))
        // Mirror the real frontier ordering: BFS enqueues at the back, DFS pushes on top (front).
        frontierOrder = frontierOrder.filter((id) => id !== nodeId)
        frontierOrder = strategy === 'bfs'
          ? [...frontierOrder, ...newNeighbors]
          : [...newNeighbors, ...frontierOrder]
        operationCount += newNeighbors.length  // frontier pushes
        emitVisit(nodeId, rootId, parentId, [...frontierOrder])
        componentNodes.push(nodeId)
      },
    })

    components.push(componentNodes)
  }

  for (const id of sortedRoots) {
    if (globalVisited.has(id)) continue
    exploreFromRoot(id)
  }

  let largestComponentSize = 0
  for (const component of components) {
    if (component.length > largestComponentSize) {
      largestComponentSize = component.length
    }
  }

  return {
    steps,
    componentCount: components.length,
    largestComponentSize,
    components,
    operationCount,
  }
}
