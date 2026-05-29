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

export type CanvasType = 'graph' | 'weighted-graph' | 'grid' | 'nqueens'

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

export type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
  startPointerX: number
  startPointerY: number
  hasMoved: boolean
}
