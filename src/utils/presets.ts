import type { GraphNode, GraphEdge, GraphPreset } from '../types'

import { NODE_SIZE } from './constants'

// Coordinates here are raw layouts. We center each preset on the actual canvas
// at apply time so it looks right regardless of canvas size.
export const GRAPH_PRESETS: GraphPreset[] = [
  // Large directed graph with all 3 edge types and numeric node values.
  {
    id: 'basic',
    name: 'Basic Graph',
    nodes: [
      { x: 60,  y: 80,  value: 5  },
      { x: 240, y: 50,  value: 12 },
      { x: 430, y: 70,  value: 3  },
      { x: 620, y: 90,  value: 8  },
      { x: 150, y: 220, value: 1  },
      { x: 340, y: 200, value: 9  },
      { x: 530, y: 220, value: 4  },
      { x: 70,  y: 380, value: 7  },
      { x: 250, y: 360, value: 2  },
      { x: 440, y: 370, value: 11 },
      { x: 620, y: 350, value: 6  },
      { x: 330, y: 480, value: 10 },
    ],
    edges: [
      [0,  1,  'forward'],
      [1,  2,  'forward'],
      [2,  3,  'forward'],
      [0,  4,  'both'],
      [1,  5,  'forward'],
      [1,  4,  'backward'],
      [2,  5,  'backward'],
      [2,  6,  'forward'],
      [3,  6,  'both'],
      [3,  10, 'forward'],
      [4,  5,  'forward'],
      [5,  6,  'both'],
      [6,  10, 'forward'],
      [4,  7,  'forward'],
      [5,  8,  'forward'],
      [6,  9,  'backward'],
      [7,  8,  'both'],
      [8,  9,  'forward'],
      [9,  10, 'both'],
      [8,  11, 'forward'],
      [9,  11, 'forward'],
    ],
  },
  // Five disconnected components of different shapes; suits connected-components algorithm.
  {
    id: 'disconnected',
    name: 'Connected Components',
    undirected: true,
    nodes: [
      // K4 complete graph (top-left)
      { x: 50,  y: 50  },
      { x: 170, y: 50  },
      { x: 170, y: 160 },
      { x: 50,  y: 160 },
      // Triangle + pendant (top-right)
      { x: 390, y: 40  },
      { x: 520, y: 40  },
      { x: 460, y: 150 },
      { x: 580, y: 160 },
      // Path of 4 (middle)
      { x: 80,  y: 300 },
      { x: 220, y: 280 },
      { x: 360, y: 300 },
      { x: 500, y: 280 },
      // Isolated node (bottom-left)
      { x: 100, y: 460 },
      // Star: 1 center + 3 spokes (bottom-right)
      { x: 490, y: 430 },
      { x: 430, y: 510 },
      { x: 510, y: 520 },
      { x: 570, y: 455 },
    ],
    edges: [
      [0,  1],
      [1,  2],
      [2,  3],
      [3,  0],
      [0,  2],
      [1,  3],
      [4,  5],
      [5,  6],
      [6,  4],
      [5,  7],
      [8,  9],
      [9,  10],
      [10, 11],
      [13, 14],
      [13, 15],
      [13, 16],
    ],
  },
  // Larger bipartite graph with dense cross-edges; suits bipartite-check algorithm.
  {
    id: 'bipartite',
    name: 'Bipartite Graph',
    undirected: true,
    nodes: [
      // Left group
      { x: 80, y: 60  },
      { x: 80, y: 170 },
      { x: 80, y: 280 },
      { x: 80, y: 390 },
      { x: 80, y: 480 },
      // Right group
      { x: 520, y: 30  },
      { x: 520, y: 140 },
      { x: 520, y: 250 },
      { x: 520, y: 360 },
      { x: 520, y: 460 },
    ],
    edges: [
      [0, 5],
      [0, 6],
      [1, 5],
      [1, 7],
      [1, 8],
      [2, 6],
      [2, 7],
      [2, 9],
      [3, 7],
      [3, 8],
      [4, 6],
      [4, 8],
      [4, 9],
    ],
  },
  // 13-node directed graph with two arcing paths from A that converge at J, plus crossing
  // diagonals and side branches. Every node has in-degree ≥ 1 so Kahn's queue starts empty.
  // DFS (back-edge on smallest-label path) finds the upper arc: A→B→E→F→H→J→K→A.
  // BFS/Kahn's (predecessor walk from smallest leftover) finds the lower arc: A→C→D→G→I→J→K→A.
  // The arcs share only the entry A and the exit leg J→K, and cross each other via D→F and E→G.
  {
    id: 'cycle',
    name: 'Cycle Detection',
    nodes: [
      { x: 75,  y: 338 },  // 0  A  — left entry, connects to both arcs
      { x: 225, y: 160 },  // 1  B  — upper arc
      { x: 220, y: 510 },  // 2  C  — lower arc
      { x: 345, y: 510 },  // 3  D  — lower arc (cross: D→F)
      { x: 430, y: 100 },  // 4  E  — upper arc (cross: E→G)
      { x: 575, y: 215 },  // 5  F  — upper arc (receives from E and D)
      { x: 470, y: 475 },  // 6  G  — lower arc (receives from D and E)
      { x: 730, y: 230 },  // 7  I  — lower arc  ← label 7, smaller than H
      { x: 690, y: 470 },  // 8  H  — upper arc  ← label 8, larger than I
      { x: 940, y: 326 },  // 9  J  — convergence (from H, I, L, M)
      { x: 375, y: 297 },  // 10 K  — shared return leg mid-point
      { x: 820, y: 160 },  // 11 L  — side branch off F
      { x: 820, y: 530 },  // 12 M  — side branch off G
    ],
    edges: [
      // Upper arc: A→B→E→F→H→J  (DFS takes this — B has label 1, smaller than C=2)
      [0,  1,  'forward'],
      [1,  4,  'forward'],
      [4,  5,  'forward'],
      [5,  8,  'forward'],
      [8,  9,  'forward'],
      // Lower arc: A→C→D→G→I→J  (Kahn's predecessor walk follows this)
      [0,  2,  'forward'],
      [2,  3,  'forward'],
      [3,  6,  'forward'],
      [6,  7,  'forward'],
      [7,  9,  'forward'],
      // Shared return: J→K→A  (both cycles close here)
      [9,  10, 'forward'],
      [10, 0,  'forward'],
      // Crossing diagonals — create the X in the middle and extra mixed cycles
      [4,  6,  'forward'],  // E→G  (upper crosses to lower)
      [3,  5,  'forward'],  // D→F  (lower crosses to upper)
      // Side branches off F and G — add extra paths into J
      [5,  11, 'forward'],  // F→L
      [11, 9,  'forward'],  // L→J
      [6,  12, 'forward'],  // G→M
      [12, 9,  'forward'],  // M→J
    ],
  },
  // Dense directed graph with all 3 edge types and many inter-node paths; suits shortest-path algorithm.
  {
    id: 'shortest-path',
    name: 'Shortest Path',
    nodes: [
      { x: 60,  y: 250 },
      { x: 190, y: 120 },
      { x: 190, y: 380 },
      { x: 330, y: 60  },
      { x: 330, y: 230 },
      { x: 330, y: 400 },
      { x: 470, y: 130 },
      { x: 470, y: 300 },
      { x: 470, y: 460 },
      { x: 610, y: 190 },
      { x: 610, y: 380 },
      { x: 720, y: 290 },
    ],
    edges: [
      [0,  1,  'forward'],
      [0,  2,  'forward'],
      [0,  4,  'both'],
      [1,  3,  'forward'],
      [1,  4,  'forward'],
      [2,  4,  'both'],
      [2,  5,  'forward'],
      [3,  6,  'forward'],
      [3,  4,  'backward'],
      [4,  6,  'forward'],
      [4,  7,  'both'],
      [5,  7,  'forward'],
      [5,  8,  'forward'],
      [6,  9,  'forward'],
      [6,  7,  'backward'],
      [7,  9,  'forward'],
      [7,  10, 'both'],
      [8,  10, 'forward'],
      [9,  11, 'forward'],
      [10, 11, 'forward'],
      [9,  10, 'backward'],
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
      value: position.value ?? 'empty',
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
