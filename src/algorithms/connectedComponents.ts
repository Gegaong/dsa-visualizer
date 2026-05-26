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
  let componentIndex = 0

  // Appends one CC step (with component root) and bumps global step order.
  const emitVisit = (nodeId: string, componentRootId: string, fromNodeId: string | null, frontierNodeIds: string[]) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    const sortedNeighbors = sortIdsByLabel(neighborsById.get(nodeId) ?? [], nodeById)
    const unseenLabels = sortedNeighbors
      .filter((id) => !globalVisited.has(id))
      .map((id) => nodeById.get(id)?.label)
      .filter((label): label is string => !!label)

    let explanation: string
    if (fromNodeId === null) {
      const neighborPart = unseenLabels.length === 0
        ? 'No neighbors to explore — this is an isolated node (its own component).'
        : `${strategy === 'bfs' ? 'Enqueuing' : 'Pushing'} ${unseenLabels.join(', ')} to explore within this component.`
      explanation = `No visited node could reach here — this begins component #${componentIndex + 1}. All nodes reachable from it will be labeled the same component. ${neighborPart}`
    } else {
      const neighborPart = unseenLabels.length === 0
        ? `${strategy === 'bfs' ? 'Queue' : 'Stack'} is empty for this branch — moving to the next node.`
        : strategy === 'bfs'
          ? `Enqueuing unseen neighbors ${unseenLabels.join(', ')} — they belong to the same component.`
          : `Pushing ${unseenLabels.join(', ')} — depth-first, these are explored before the ones already waiting.`
      explanation = strategy === 'bfs'
        ? `Queue dequeued ${node.label} — discovered earlier, now being processed. ${neighborPart}`
        : `Stack popped ${node.label} — most recently pushed, so explored first. ${neighborPart}`
    }

    steps.push({
      nodeId: node.id,
      nodeLabel: node.label,
      order,
      componentRootNodeId: componentRootId,
      fromNodeId,
      frontierNodeIds,
      explanation,
    })
    order += 1
  }

  // Neighbor expansion order: sorted by visible label so playback is deterministic.
  const orderNeighbors = (raw: string[]) => sortIdsByLabel(raw, nodeById)

  // Collects one component's node ids in walk order, starting from an unvisited root.
  const exploreFromRoot = (rootId: string) => {
    const componentNodes: string[] = []
    const frontierIds = new Set<string>([rootId])

    traverseReachableFrom({
      neighborsById,
      startId: rootId,
      visited: globalVisited,
      strategy,
      orderNeighbors,
      onVisit: (nodeId, parentId) => {
        frontierIds.delete(nodeId)
        const newNeighbors = (neighborsById.get(nodeId) ?? []).filter(id => !globalVisited.has(id))
        for (const id of newNeighbors) frontierIds.add(id)
        emitVisit(nodeId, rootId, parentId, [...frontierIds])
        componentNodes.push(nodeId)
      },
    })

    components.push(componentNodes)
    componentIndex += 1
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
  }
}
