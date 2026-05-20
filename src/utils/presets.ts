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

// Five undirected weighted-graph presets for Dijkstra, Greedy best-first, and A*.
// Ordered by complexity: Preset 1 is simplest (9 nodes), each subsequent preset adds ~3 nodes.
// All presets use a monotone-downward edge pattern between columns (each node only connects
// to the same row or one row lower in the next column, never upward). This guarantees that
// no two edges form an X-cross, so weight badge midpoints never overlap.
export const WEIGHTED_GRAPH_PRESETS: GraphPreset[] = [
  // 9 nodes: source + col-A(2) + col-B(3) + col-C(2) + sink.
  {
    id: 'weighted-preset-1',
    name: 'Preset 1',
    undirected: true,
    nodes: [
      { x: 60,  y: 240 },  // 0  source
      { x: 220, y: 80  },  // 1  col-A top
      { x: 220, y: 400 },  // 2  col-A bot
      { x: 410, y: 55  },  // 3  col-B top
      { x: 410, y: 235 },  // 4  col-B mid
      { x: 410, y: 415 },  // 5  col-B bot
      { x: 600, y: 95  },  // 6  col-C top
      { x: 600, y: 385 },  // 7  col-C bot
      { x: 780, y: 240 },  // 8  sink
    ],
    edges: [
      // source → col-A
      [0, 1, 'both', 3],
      [0, 2, 'both', 2],
      // col-A → col-B  (monotone: row0→row0,row1 ; row1→row1,row2)
      [1, 3, 'both', 5],
      [1, 4, 'both', 4],
      [2, 4, 'both', 4],
      [2, 5, 'both', 2],
      // col-B → col-C  (monotone: row0→row0 ; row0→row1 ; row1→row1 ; row2→row1)
      [3, 6, 'both', 3],
      [3, 7, 'both', 9],
      [4, 7, 'both', 5],
      [5, 7, 'both', 2],
      // col-C → sink
      [6, 8, 'both', 7],
      [7, 8, 'both', 3],
    ],
  },
  // 15 nodes: source + col-A(3) + col-B(4) + col-C(4) + col-D(3).
  {
    id: 'weighted-preset-2',
    name: 'Preset 2',
    undirected: true,
    nodes: [
      { x: 60,  y: 260 },  // 0  source
      { x: 215, y: 80  },  // 1  col-A top
      { x: 215, y: 255 },  // 2  col-A mid
      { x: 215, y: 440 },  // 3  col-A bot
      { x: 390, y: 60  },  // 4  col-B row0
      { x: 390, y: 185 },  // 5  col-B row1
      { x: 390, y: 315 },  // 6  col-B row2
      { x: 390, y: 450 },  // 7  col-B row3
      { x: 560, y: 65  },  // 8  col-C row0
      { x: 560, y: 190 },  // 9  col-C row1
      { x: 560, y: 320 },  // 10 col-C row2
      { x: 560, y: 455 },  // 11 col-C row3
      { x: 730, y: 110 },  // 12 col-D top
      { x: 730, y: 270 },  // 13 col-D mid
      { x: 730, y: 435 },  // 14 col-D bot
    ],
    edges: [
      // source → col-A
      [0, 1,  'both', 4],
      [0, 2,  'both', 2],
      [0, 3,  'both', 5],
      // col-A(3) → col-B(4)  (row0→r0,r1 ; row1→r1,r2 ; row2→r2,r3)
      [1, 4,  'both', 2],
      [1, 5,  'both', 6],
      [2, 5,  'both', 2],
      [2, 6,  'both', 5],
      [3, 6,  'both', 2],
      [3, 7,  'both', 4],
      // col-B(4) → col-C(4)  (monotone same+down)
      [4, 8,  'both', 3],
      [4, 9,  'both', 7],
      [5, 9,  'both', 2],
      [5, 10, 'both', 6],
      [6, 10, 'both', 2],
      [6, 11, 'both', 5],
      [7, 11, 'both', 2],
      // col-C(4) → col-D(3)  (r0→top,mid ; r1→mid,bot ; r2→bot ; r3→bot)
      [8,  12, 'both', 3],
      [8,  13, 'both', 7],
      [9,  13, 'both', 2],
      [9,  14, 'both', 6],
      [10, 14, 'both', 2],
      [11, 14, 'both', 4],
    ],
  },
  // 21 nodes: source + col-A(4) + col-B(4) + col-C(4) + col-D(4) + col-E(4).
  {
    id: 'weighted-preset-3',
    name: 'Preset 3',
    undirected: true,
    nodes: [
      { x: 60,  y: 270 },  // 0  source
      { x: 205, y: 60  },  // 1  col-A row0
      { x: 205, y: 175 },  // 2  col-A row1
      { x: 205, y: 295 },  // 3  col-A row2
      { x: 205, y: 420 },  // 4  col-A row3
      { x: 375, y: 60  },  // 5  col-B row0
      { x: 375, y: 175 },  // 6  col-B row1
      { x: 375, y: 295 },  // 7  col-B row2
      { x: 375, y: 420 },  // 8  col-B row3
      { x: 545, y: 60  },  // 9  col-C row0
      { x: 545, y: 175 },  // 10 col-C row1
      { x: 545, y: 295 },  // 11 col-C row2
      { x: 545, y: 420 },  // 12 col-C row3
      { x: 715, y: 75  },  // 13 col-D row0
      { x: 715, y: 190 },  // 14 col-D row1
      { x: 715, y: 310 },  // 15 col-D row2
      { x: 715, y: 430 },  // 16 col-D row3
      { x: 885, y: 90  },  // 17 col-E row0
      { x: 885, y: 205 },  // 18 col-E row1
      { x: 885, y: 325 },  // 19 col-E row2
      { x: 885, y: 445 },  // 20 col-E row3
    ],
    edges: [
      // source → col-A
      [0,  1,  'both', 6],
      [0,  2,  'both', 2],
      [0,  3,  'both', 4],
      [0,  4,  'both', 3],
      // col-A → col-B  (monotone same+down)
      [1,  5,  'both', 2],
      [1,  6,  'both', 5],
      [2,  6,  'both', 3],
      [2,  7,  'both', 2],
      [3,  7,  'both', 4],
      [3,  8,  'both', 6],
      [4,  8,  'both', 2],
      // col-B → col-C  (monotone same+down)
      [5,  9,  'both', 5],
      [5,  10, 'both', 2],
      [6,  10, 'both', 4],
      [6,  11, 'both', 3],
      [7,  11, 'both', 2],
      [7,  12, 'both', 6],
      [8,  12, 'both', 3],
      // col-C → col-D  (monotone same+down)
      [9,  13, 'both', 2],
      [9,  14, 'both', 6],
      [10, 14, 'both', 3],
      [10, 15, 'both', 2],
      [11, 15, 'both', 5],
      [11, 16, 'both', 3],
      [12, 16, 'both', 4],
      // col-D → col-E  (monotone same+down)
      [13, 17, 'both', 3],
      [13, 18, 'both', 5],
      [14, 18, 'both', 2],
      [14, 19, 'both', 4],
      [15, 19, 'both', 3],
      [15, 20, 'both', 2],
      [16, 20, 'both', 5],
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

  const edges: GraphEdge[] = preset.edges.map(([fromIndex, toIndex, direction, weight]) => {
    const edge: GraphEdge = {
      id: `edge-${counter}`,
      fromNodeId: nodes[fromIndex].id,
      toNodeId: nodes[toIndex].id,
      direction: direction ?? 'both',
      ...(weight !== undefined && { weight }),
    }
    counter += 1
    return edge
  })

  return { nodes, edges, nextId: counter }
}
