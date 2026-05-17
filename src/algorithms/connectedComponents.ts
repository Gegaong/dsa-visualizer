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
export function runConnectedComponents(
  nodes: GraphNode[],
  edges: GraphEdge[],
  strategy: TraversalStrategy,
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
  const sortedRoots = sortIdsByLabel(
    nodes.map((node) => node.id),
    nodeById,
  )

  const globalVisited = new Set<string>()
  const components: string[][] = []
  const steps: ConnectedComponentsStep[] = []
  let order = 1

  // Appends one CC step (with component root) and bumps global step order.
  const emitVisit = (nodeId: string, componentRootId: string, fromNodeId: string | null) => {
    const node = nodeById.get(nodeId)
    if (!node) return
    steps.push({
      nodeId: node.id,
      nodeLabel: node.label,
      order,
      componentRootNodeId: componentRootId,
      fromNodeId,
    })
    order += 1
  }

  // Neighbor expansion order: sorted by visible label so playback is deterministic.
  const orderNeighbors = (raw: string[]) => sortIdsByLabel(raw, nodeById)

  // Collects one component's node ids in walk order, starting from an unvisited root.
  const exploreFromRoot = (rootId: string) => {
    const componentNodes: string[] = []

    traverseReachableFrom({
      neighborsById,
      startId: rootId,
      visited: globalVisited,
      strategy,
      orderNeighbors,
      onVisit: (nodeId, parentId) => {
        emitVisit(nodeId, rootId, parentId)
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
  }
}
