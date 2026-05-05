import type { GraphNode, GraphEdge, GraphPreset } from '../types'
import { NODE_SIZE } from './constants'

// Coordinates here are raw layouts. We center each preset on the actual canvas
// at apply time so it looks right regardless of canvas size.
export const GRAPH_PRESETS: GraphPreset[] = [
  {
    id: 'basic',
    name: 'Basic Graph',
    nodes: [
      { x: 120, y: 100 },
      { x: 260, y: 70 },
      { x: 420, y: 120 },
      { x: 320, y: 210 },
      { x: 160, y: 230 },
      { x: 470, y: 240 },
      { x: 560, y: 150 },
      { x: 120, y: 320 },
      { x: 300, y: 320 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [4, 0],
      [3, 5],
      [5, 6],
      [2, 6],
      [4, 7],
      [7, 8],
      [8, 3],
    ],
  },
  {
    id: 'cycle',
    name: 'Cycle Graph',
    nodes: [
      { x: 260, y: 40 },
      { x: 380, y: 90 },
      { x: 420, y: 210 },
      { x: 340, y: 320 },
      { x: 200, y: 320 },
      { x: 120, y: 210 },
      { x: 160, y: 90 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
    ],
  },
  {
    id: 'disconnected',
    name: 'Disconnected Graph',
    nodes: [
      { x: 140, y: 120 },
      { x: 240, y: 90 },
      { x: 260, y: 200 },
      { x: 160, y: 230 },
      { x: 420, y: 120 },
      { x: 520, y: 120 },
      { x: 540, y: 220 },
      { x: 440, y: 220 },
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
    ],
  },
  {
    id: 'bipartite',
    name: 'Bipartite Graph',
    nodes: [
      { x: 140, y: 80 },
      { x: 140, y: 180 },
      { x: 140, y: 280 },
      { x: 140, y: 380 },
      { x: 460, y: 100 },
      { x: 460, y: 200 },
      { x: 460, y: 300 },
      { x: 460, y: 400 },
    ],
    edges: [
      [0, 4],
      [0, 5],
      [1, 5],
      [1, 6],
      [2, 6],
      [2, 7],
      [3, 4],
      [3, 7],
    ],
  },
]

export type BuildPresetGraphResult = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nextId: number
}

// Turn a preset definition + canvas dimensions into ready-to-render nodes and edges.
// Shifts the layout to the canvas center, clamps every node inside the bounds, and
// assigns fresh sequential IDs starting at 1. Labels are intentionally left empty —
// the caller runs reindexNodes so the A,B,C... order matches the array order.
export const buildPresetGraph = (
  preset: GraphPreset,
  canvasWidth: number,
  canvasHeight: number,
): BuildPresetGraphResult => {
  const bounds = preset.nodes.reduce(
    (acc, node) => {
      const right = node.x + NODE_SIZE
      const bottom = node.y + NODE_SIZE
      return {
        minX: Math.min(acc.minX, node.x),
        minY: Math.min(acc.minY, node.y),
        maxX: Math.max(acc.maxX, right),
        maxY: Math.max(acc.maxY, bottom),
      }
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  )

  const targetCenterX = canvasWidth / 2
  const targetCenterY = canvasHeight / 2
  const presetCenterX = (bounds.minX + bounds.maxX) / 2
  const presetCenterY = (bounds.minY + bounds.maxY) / 2
  const offsetX = targetCenterX - presetCenterX
  const offsetY = targetCenterY - presetCenterY

  let counter = 1

  const nodes: GraphNode[] = preset.nodes.map((position) => {
    const clampedX = Math.min(
      Math.max(0, position.x + offsetX),
      canvasWidth - NODE_SIZE,
    )
    const clampedY = Math.min(
      Math.max(0, position.y + offsetY),
      canvasHeight - NODE_SIZE,
    )
    const node: GraphNode = {
      id: `node-${counter}`,
      label: '',
      value: null,
      x: clampedX,
      y: clampedY,
    }
    counter += 1
    return node
  })

  const edges: GraphEdge[] = preset.edges.map(([fromIndex, toIndex, direction]) => {
    const edge: GraphEdge = {
      id: `edge-${counter}`,
      fromNodeId: nodes[fromIndex].id,
      toNodeId: nodes[toIndex].id,
      direction: direction ?? 'both',
    }
    counter += 1
    return edge
  })

  return { nodes, edges, nextId: counter }
}
