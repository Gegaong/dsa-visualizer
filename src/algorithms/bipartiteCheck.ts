import type { GraphEdge, GraphNode } from '../types'

import type { BipartiteResult, BipartiteStep } from './algorithmstypes'

import { buildWeaklyConnectedNeighborsMap } from './graphAdjacency'

import { sortIdsByLabel } from './sortIdsByLabel'

type GraphLookups = {
  nodeById: Map<string, GraphNode>
  neighborsById: Map<string, string[]>
  sortedNodeIds: string[]
}

// Pre-builds neighbor and node-id maps; neighbors within each list are sorted by label.
// If startNodeId is provided and valid, that node is placed first in the iteration order.
function buildLookups(nodes: GraphNode[], edges: GraphEdge[], startNodeId?: string): GraphLookups {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const rawNeighbors = buildWeaklyConnectedNeighborsMap(nodes, edges)
  const neighborsById = new Map<string, string[]>()
  rawNeighbors.forEach((ids, id) => neighborsById.set(id, sortIdsByLabel(ids, nodeById)))
  let sortedNodeIds = sortIdsByLabel(nodes.map((n) => n.id), nodeById)
  if (startNodeId && nodeById.has(startNodeId)) {
    sortedNodeIds = [startNodeId, ...sortedNodeIds.filter((id) => id !== startNodeId)]
  }
  return { nodeById, neighborsById, sortedNodeIds }
}

type ColorMap = Map<string, 0 | 1>

type Coloring = {
  colorMap: ColorMap
  isBipartite: boolean
}

// BFS 2-coloring: assigns alternating colors level by level; emits a step when each node is colored.
function colorBfs(
  lookups: GraphLookups,
  emitStep: (nodeId: string, color: 0 | 1, fromNodeId: string | null) => void,
): Coloring {
  const { neighborsById, sortedNodeIds } = lookups
  const colorMap: ColorMap = new Map()
  let isBipartite = true

  for (const rootId of sortedNodeIds) {
    if (colorMap.has(rootId)) continue
    colorMap.set(rootId, 0)
    emitStep(rootId, 0, null)
    const queue: string[] = [rootId]

    while (queue.length > 0) {
      const id = queue.shift()!
      const nodeColor = colorMap.get(id)!
      for (const neighborId of neighborsById.get(id) ?? []) {
        if (!colorMap.has(neighborId)) {
          const neighborColor = (1 - nodeColor) as 0 | 1
          colorMap.set(neighborId, neighborColor)
          emitStep(neighborId, neighborColor, id)
          queue.push(neighborId)
        } else if (colorMap.get(neighborId) === nodeColor) {
          isBipartite = false
        }
      }
    }
  }

  return { colorMap, isBipartite }
}

// DFS 2-coloring: iterative with an explicit stack; emits a step when each node is colored.
// Neighbors pushed in reverse so the smallest-label neighbor is explored first (deterministic).
function colorDfs(
  lookups: GraphLookups,
  emitStep: (nodeId: string, color: 0 | 1, fromNodeId: string | null) => void,
): Coloring {
  const { neighborsById, sortedNodeIds } = lookups
  const colorMap: ColorMap = new Map()
  let isBipartite = true

  type Frame = { id: string; targetColor: 0 | 1; parentId: string | null }

  for (const rootId of sortedNodeIds) {
    if (colorMap.has(rootId)) continue
    const stack: Frame[] = [{ id: rootId, targetColor: 0, parentId: null }]

    while (stack.length > 0) {
      const { id, targetColor, parentId } = stack.pop()!

      if (colorMap.has(id)) {
        if (colorMap.get(id) !== targetColor) isBipartite = false
        continue
      }

      colorMap.set(id, targetColor)
      emitStep(id, targetColor, parentId)

      const oppositeColor = (1 - targetColor) as 0 | 1
      const neighbors = neighborsById.get(id) ?? []
      for (let i = neighbors.length - 1; i >= 0; i -= 1) {
        stack.push({ id: neighbors[i], targetColor: oppositeColor, parentId: id })
      }
    }
  }

  return { colorMap, isBipartite }
}

// Runs the 2-coloring bipartite check on an undirected graph (edge directions are ignored).
// Emits one step per node as it gets assigned to group A (color 0) or group B (color 1).
// startNodeId is optional — when given, traversal begins from that node instead of the default order.
export function runBipartiteCheck(
  nodes: GraphNode[],
  edges: GraphEdge[],
  strategy: 'bfs' | 'dfs',
  startNodeId?: string,
): BipartiteResult {
  if (nodes.length === 0) {
    return { steps: [], isBipartite: true, groupANodeIds: [], groupBNodeIds: [] }
  }

  const lookups = buildLookups(nodes, edges, startNodeId)
  const steps: BipartiteStep[] = []
  let order = 1

  const emitStep = (nodeId: string, color: 0 | 1, fromNodeId: string | null) => {
    const node = lookups.nodeById.get(nodeId)
    if (!node) return
    steps.push({ nodeId: node.id, nodeLabel: node.label, order, fromNodeId, color })
    order += 1
  }

  const { colorMap, isBipartite } =
    strategy === 'bfs' ? colorBfs(lookups, emitStep) : colorDfs(lookups, emitStep)

  const groupANodeIds: string[] = []
  const groupBNodeIds: string[] = []
  colorMap.forEach((color, id) => {
    if (color === 0) groupANodeIds.push(id)
    else groupBNodeIds.push(id)
  })

  return { steps, isBipartite, groupANodeIds, groupBNodeIds }
}
