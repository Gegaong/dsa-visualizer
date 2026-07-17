export type GraphNode = {
  id: string
  label: string
  // 'empty' = blank (default for new/preset nodes); number = user-entered or fill-generated value.
  value: number | 'empty'
  x: number
  y: number
}

export type GoalType =
  | 'target-node'
  | 'target-value'
  | 'max-value'
  | 'min-value'

export type ContextMenuState = {
  nodeId: string
  x: number
  y: number
  heuristic?: number
}

export type GraphEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  direction: 'both' | 'forward' | 'backward'
  weight?: number
}

export type CanvasType = 'graph' | 'weighted-graph' | 'grid' | 'nqueens' | 'binary-tree'

export type EdgeContextMenuState = {
  edgeId: string
  x: number
  y: number
}

export type GraphPreset = {
  id: string
  name: string
  // When true, applying this preset switches the canvas to undirected mode.
  undirected?: boolean
  nodes: Array<{ x: number; y: number; value?: number }>
  edges: Array<[number, number, GraphEdge['direction']?, number?]>
}

// Binary-tree canvas preset: nodes listed in insertion order; root is index 0.
// left/right are indices into the same array (or null for an empty child slot).
export type BinaryTreePreset = {
  id: string
  name: string
  nodes: Array<{ value: number; left: number | null; right: number | null }>
}

export type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
  startPointerX: number
  startPointerY: number
  hasMoved: boolean
}

// Plain binary tree node: no parent pointer, matches the textbook {value, left, right} shape.
// leftId/rightId are null when that child slot is empty (renders as an "add" indicator).
export type BinaryTreeNode = {
  id: string
  // Display name (A, B, C, ...), recomputed after every add/delete — same convention as GraphNode.
  label: string
  value: number | 'empty'
  leftId: string | null
  rightId: string | null
}

export type BinaryTree = {
  rootId: string | null
  nodesById: Record<string, BinaryTreeNode>
}

export type BinaryTreeSide = 'left' | 'right'

export type BinaryTreeContextMenuState = {
  nodeId: string
  x: number
  y: number
}
