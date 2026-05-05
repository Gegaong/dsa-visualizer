export type GraphNode = {
  id: string
  label: string
  value: number | null
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
}

export type GraphEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  direction: 'both' | 'forward' | 'backward'
}

export type GraphPreset = {
  id: string
  name: string
  nodes: Array<{ x: number; y: number }>
  edges: Array<[number, number, GraphEdge['direction']?]>
}

export type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
  startPointerX: number
  startPointerY: number
  hasMoved: boolean
}
