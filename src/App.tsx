import { useEffect, useRef, useState } from 'react'
import './App.css'

type GraphNode = {
  id: string
  label: string
  value: number | null
  x: number
  y: number
}

type GoalType =
  | 'target-node'
  | 'target-value'
  | 'max-value'
  | 'min-value'

type ContextMenuState = {
  nodeId: string
  x: number
  y: number
}

type GraphEdge = {
  id: string
  fromNodeId: string
  toNodeId: string
  direction: 'both' | 'forward' | 'backward'
}

type GraphPreset = {
  id: string
  name: string
  nodes: Array<{ x: number; y: number }>
  edges: Array<[number, number, GraphEdge['direction']?]>
}

type DragState = {
  nodeId: string
  offsetX: number
  offsetY: number
  startPointerX: number
  startPointerY: number
  hasMoved: boolean
}

const NODE_SIZE = 48
const NODE_RADIUS = NODE_SIZE / 2
const NODE_GAP = 8 // extra spacing between nodes (in px)
const MIN_EDGE_STUB = 8
const MIN_EDGE_VISUAL_LENGTH = 20
const MIN_TOGGLE_EDGE_LENGTH = 36
const TINY_EDGE_MARKER_EDGE_LENGTH = 16
const SHORT_EDGE_MARKER_EDGE_LENGTH = 26
const DEFAULT_CANVAS_WIDTH = 720
const DEFAULT_CANVAS_HEIGHT = 560
const DRAG_THRESHOLD = 3

const toDegrees = (radians: number) => (radians * 180) / Math.PI
const sanitizeNumericInput = (value: string) =>
  value.replace(/[^0-9-]/g, '').replace(/(?!^)-/g, '')
const parseNumberInput = (value: string) => {
  const trimmed = value.trim()

  if (trimmed === '' || trimmed === '-') {
    return null
  }

  const numberValue = Number(trimmed)
  return Number.isNaN(numberValue) ? null : numberValue
}

// Inclusive integer RNG used when filling null node values.
const getRandomIntInclusive = (min: number, max: number) => {
  const low = Math.ceil(min)
  const high = Math.floor(max)
  return Math.floor(Math.random() * (high - low + 1)) + low
}

// Convert array index (0, 1, 2, ...) to Alphabetical style column labels (A, B, C, ..., Z, AA, AB, ...)
const indexToLabel = (index: number) => {
  let label = ''
  let remaining = index + 1

  while (remaining > 0) {
    const remainder = (remaining - 1) % 26
    label = String.fromCharCode(65 + remainder) + label
    remaining = Math.floor((remaining - 1) / 26)
  }

  return label
}

// Recalculate labels for all nodes based on their position in the array.
// Used after deletion to maintain consistent A, B, C... labeling.
const reindexNodes = (list: GraphNode[]) =>
  list.map((node, index) => ({
    ...node,
    label: indexToLabel(index),
  }))

// Format node values for display: fit large numbers into the small circle by shrinking font or truncating.
const formatNodeValue = (value: number | null) => {
  if (value === null) {
    return { text: 'null', sizeClass: 'node-value--small' }
  }

  const text = String(value)

  if (text.length <= 3) {
    return { text, sizeClass: '' } // Normal size
  }

  if (text.length <= 5) {
    return { text, sizeClass: 'node-value--small' } // Shrink font slightly
  }

  return { text: '...', sizeClass: 'node-value--tiny' } // Shrink more or show ellipsis
}

// Check if a new node at (x, y) overlaps with any existing nodes using distance-based collision detection.
const isOverlapping = (x: number, y: number, list: GraphNode[]) => {
  const newCenterX = x + NODE_RADIUS
  const newCenterY = y + NODE_RADIUS
  const minDistance = NODE_SIZE + NODE_GAP // Minimum distance between centers (both radii + gap)

  return list.some((node) => {
    const existingCenterX = node.x + NODE_RADIUS
    const existingCenterY = node.y + NODE_RADIUS
    const dx = existingCenterX - newCenterX
    const dy = existingCenterY - newCenterY

    // Use squared distance to avoid sqrt() overhead
    return dx * dx + dy * dy < minDistance * minDistance
  })
}

const clampToRange = (value: number, min: number, max: number) =>
  Math.min(Math.max(min, value), max)

// Push a dropped node away from neighbors to preserve the same minimum spacing.
const resolveDragPosition = (
  x: number,
  y: number,
  nodeId: string,
  list: GraphNode[],
  canvasWidth: number,
  canvasHeight: number,
) => {
  const minDistance = NODE_SIZE + NODE_GAP
  const maxX = canvasWidth - NODE_SIZE
  const maxY = canvasHeight - NODE_SIZE
  let resolvedX = clampToRange(x, 0, maxX)
  let resolvedY = clampToRange(y, 0, maxY)

  for (let pass = 0; pass < 4; pass += 1) {
    let adjusted = false

    for (const other of list) {
      if (other.id === nodeId) continue

      const centerX = resolvedX + NODE_RADIUS
      const centerY = resolvedY + NODE_RADIUS
      const otherCenterX = other.x + NODE_RADIUS
      const otherCenterY = other.y + NODE_RADIUS
      const dx = centerX - otherCenterX
      const dy = centerY - otherCenterY
      const distance = Math.hypot(dx, dy)

      if (distance < minDistance) {
        const push = minDistance - distance
        const dirX = distance === 0 ? 1 : dx / distance
        const dirY = distance === 0 ? 0 : dy / distance
        resolvedX = clampToRange(resolvedX + dirX * push, 0, maxX)
        resolvedY = clampToRange(resolvedY + dirY * push, 0, maxY)
        adjusted = true
      }
    }

    if (!adjusted) {
      break
    }
  }

  return { x: resolvedX, y: resolvedY }
}

const DirectionIcon = ({ direction }: { direction: GraphEdge['direction'] }) => {
  // Node-reference style:
  // - forward: dot then arrow away (outbound)
  // - backward: arrow toward dot (inbound)
  // - both: arrows both ways with dot in center (bidirectional)
  return (
    <svg className="direction-icon" viewBox="0 0 24 24" aria-hidden="true">
      {direction === 'forward' && (
        <>
          <circle cx="7" cy="12" r="2.7" />
          <path
            d="M10 12h8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M16 9l3 3-3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {direction === 'backward' && (
        <>
          <path
            d="M14 12H6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 9l-3 3 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="12" r="2.7" />
        </>
      )}
      {direction === 'both' && (
        <>
          <path
            d="M6 12h12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M8 9l-3 3 3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 9l3 3-3 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="2.9" />
        </>
      )}
    </svg>
  )
}

const getEdgeGeometry = (fromNode: GraphNode, toNode: GraphNode) => {
  const x1 = fromNode.x + NODE_RADIUS
  const y1 = fromNode.y + NODE_RADIUS
  const x2 = toNode.x + NODE_RADIUS
  const y2 = toNode.y + NODE_RADIUS

  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)

  if (dist < 0.001) {
    return null
  }

  const unitX = dx / dist
  const unitY = dy / dist
  // Keep a minimum visible edge length so arrowheads don't crowd on short edges.
  const minVisibleLength = Math.max(MIN_EDGE_STUB, MIN_EDGE_VISUAL_LENGTH)
  const inset = Math.min(
    NODE_RADIUS,
    Math.max(0, (dist - minVisibleLength) / 2),
  )

  const startX = x1 + unitX * inset
  const startY = y1 + unitY * inset
  const endX = x2 - unitX * inset
  const endY = y2 - unitY * inset
  const edgeLength = dist - 2 * inset

  return {
    x1,
    y1,
    x2,
    y2,
    startX,
    startY,
    endX,
    endY,
    edgeLength,
  }
}

// Preset layouts use fixed coordinates (values are null); we center them in the canvas at apply time.
const GRAPH_PRESETS: GraphPreset[] = [
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

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('') // Temporary input value during inline editing
  const [fillMin, setFillMin] = useState('')
  const [fillMax, setFillMax] = useState('')
  const [showNullifyConfirm, setShowNullifyConfirm] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showPresetConfirm, setShowPresetConfirm] = useState(false)
  const [pendingPreset, setPendingPreset] = useState<GraphPreset | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [isDeleteEdgeMode, setIsDeleteEdgeMode] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [newEdgeDirection, setNewEdgeDirection] = useState<GraphEdge['direction']>('both')
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  // useRef instead of useState: changing nextId doesn't trigger a re-render (we only use it for ID generation)
  const nextId = useRef(1)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const suppressCanvasClickRef = useRef(false)

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  const applyPreset = (preset: GraphPreset) => {
    nextId.current = 1

    // Compute a bounding box so we can center the preset on the canvas.
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

    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    const canvasWidth = canvasBounds?.width ?? DEFAULT_CANVAS_WIDTH
    const canvasHeight = canvasBounds?.height ?? DEFAULT_CANVAS_HEIGHT
    // Offset the preset so its center lands on the canvas center.
    const targetCenterX = canvasWidth / 2
    const targetCenterY = canvasHeight / 2
    const presetCenterX = (bounds.minX + bounds.maxX) / 2
    const presetCenterY = (bounds.minY + bounds.maxY) / 2
    const offsetX = targetCenterX - presetCenterX
    const offsetY = targetCenterY - presetCenterY

    const presetNodes = preset.nodes.map((position) => {
      // Clamp to keep nodes inside the canvas bounds after centering.
      const clampedX = Math.min(
        Math.max(0, position.x + offsetX),
        canvasWidth - NODE_SIZE,
      )
      const clampedY = Math.min(
        Math.max(0, position.y + offsetY),
        canvasHeight - NODE_SIZE,
      )
      const node: GraphNode = {
        id: `node-${nextId.current}`,
        label: '',
        value: null,
        x: clampedX,
        y: clampedY,
      }

      nextId.current += 1
      return node
    })

    const presetEdges: GraphEdge[] = preset.edges.map(([fromIndex, toIndex, direction]) => {
      const edge: GraphEdge = {
        id: `edge-${nextId.current}`,
        fromNodeId: presetNodes[fromIndex].id,
        toNodeId: presetNodes[toIndex].id,
        direction: direction ?? 'both',
      }

      nextId.current += 1
      return edge
    })

    setNodes(reindexNodes(presetNodes))
    setEdges(presetEdges)
    cancelEditing()
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
    closeContextMenu()
  }

  // Delete a single node and all its connected edges, then recalculate node labels.
  const deleteNode = (nodeId: string) => {
    setNodes((prev) => reindexNodes(prev.filter((node) => node.id !== nodeId)))
    setEdges((prev) =>
      prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId),
    )
    setSelectedEdgeIds((prev) =>
      prev.filter(
        (edgeId) =>
          !edges.some(
            (edge) =>
              edge.id === edgeId &&
              (edge.fromNodeId === nodeId || edge.toNodeId === nodeId),
          ),
      ),
    )
  }

  // Delete multiple nodes at once (used in delete mode) and clean up their edges.
  const deleteSelectedNodes = (nodeIds: string[]) => {
    if (nodeIds.length === 0) {
      return
    }

    const idSet = new Set(nodeIds)
    setNodes((prev) => reindexNodes(prev.filter((node) => !idSet.has(node.id))))
    setEdges((prev) =>
      prev.filter((edge) => !idSet.has(edge.fromNodeId) && !idSet.has(edge.toNodeId)),
    )
    setSelectedEdgeIds((prev) =>
      prev.filter(
        (edgeId) =>
          !edges.some(
            (edge) =>
              edge.id === edgeId &&
              (idSet.has(edge.fromNodeId) || idSet.has(edge.toNodeId)),
          ),
      ),
    )
  }

  const deleteSelectedEdges = (edgeIds: string[]) => {
    if (edgeIds.length === 0) {
      return
    }

    const idSet = new Set(edgeIds)
    setEdges((prev) => prev.filter((edge) => !idSet.has(edge.id)))
  }

  // NOTE: Edge deletion workflow
  // - `isDeleteEdgeMode` toggles a special interaction mode where edges are selectable for deletion.
  // - We keep the visible edge line and its arrow markers unchanged to avoid resizing markers
  //   (marker sizes are tied to the visual line width in SVG). Instead, selection is
  //   indicated with an overlaid badge and a soft halo line so arrowheads never rescale.

  // Toggle a node's selected state for delete mode (add or remove from selection list).
  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  const clearSelection = () => {
    setSelectedNodeIds([])
  }

  const toggleEdgeSelection = (edgeId: string) => {
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId],
    )
  }

  const clearEdgeSelection = () => {
    setSelectedEdgeIds([])
  }

  // Mode management: Connect and Delete are mutually exclusive.
  // When entering one mode, we automatically exit the other and clean up.
  const enterDeleteMode = () => {
    setIsConnectMode(false) // Exit connect mode first
    setConnectionSource(null)
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
    setIsDeleteMode(true)
    clearSelection()
    closeContextMenu()
  }

  const enterDeleteEdgeMode = () => {
    setIsConnectMode(false)
    setConnectionSource(null)
    setIsDeleteMode(false)
    clearSelection()
    setIsDeleteEdgeMode(true)
    clearEdgeSelection()
    closeContextMenu()
  }

  const enterConnectMode = () => {
    setIsDeleteMode(false) // Exit delete mode first
    setIsDeleteEdgeMode(false)
    clearSelection()
    clearEdgeSelection()
    setIsConnectMode(true)
    setConnectionSource(null)
    setNewEdgeDirection('both')
    closeContextMenu()
  }

  const exitDeleteMode = () => {
    setIsDeleteMode(false)
    clearSelection()
  }

  const exitDeleteEdgeMode = () => {
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
  }

  // Enter inline-editing mode for a node's value. Cancel any active modes and prep the input field.
  const beginEditingNode = (node: GraphNode) => {
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
    setEditingNodeId(node.id)
    setDraftValue(node.value === null ? '' : String(node.value))
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressCanvasClickRef.current) {
      suppressCanvasClickRef.current = false
      return
    }

    if (contextMenu) {
      closeContextMenu()
    }

    if (isDeleteMode || isDeleteEdgeMode || isConnectMode) {
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const rawX = event.clientX - rect.left
    const rawY = event.clientY - rect.top
    const clampedX = Math.min(Math.max(0, rawX - NODE_RADIUS), rect.width - NODE_SIZE)
    const clampedY = Math.min(Math.max(0, rawY - NODE_RADIUS), rect.height - NODE_SIZE)

    setNodes((prev) => {
      if (isOverlapping(clampedX, clampedY, prev)) {
        return prev
      }

      const newNode: GraphNode = {
        id: `node-${nextId.current}`,
        label: '',
        value: null,
        x: clampedX,
        y: clampedY,
      }

      nextId.current += 1
      return reindexNodes([...prev, newNode])
    })
  }

  // Block the browser's default right-click menu and close any open custom menus.
  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    closeContextMenu()
  }

  // Start editing a node when clicked (unless in delete mode).
  const startEditingNode = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (isDeleteMode) {
      return
    }

    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    event.stopPropagation()
    beginEditingNode(node)
  }

  const handleNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (event.button !== 0) {
      return
    }

    if (isConnectMode || isDeleteMode || isDeleteEdgeMode || editingNodeId === node.id) {
      return
    }

    const canvasBounds = canvasRef.current?.getBoundingClientRect()

    if (!canvasBounds) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    closeContextMenu()

    const pointerX = event.clientX - canvasBounds.left
    const pointerY = event.clientY - canvasBounds.top
    dragStateRef.current = {
      nodeId: node.id,
      offsetX: pointerX - node.x,
      offsetY: pointerY - node.y,
      startPointerX: pointerX,
      startPointerY: pointerY,
      hasMoved: false,
    }
    setDraggingNodeId(node.id)
  }

  // Open a context menu for a node's right-click. Clamp menu position to stay on-screen.
  const handleNodeContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    node: GraphNode,
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const menuWidth = 220
    const menuHeight = 160
    const padding = 12
    // Prevent menu from flowing off-screen by shifting it left/up if needed
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)

    setContextMenu({ nodeId: node.id, x, y })
  }

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const canvasBounds = canvasRef.current?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointerX = event.clientX - canvasBounds.left
      const pointerY = event.clientY - canvasBounds.top
      const deltaX = pointerX - dragState.startPointerX
      const deltaY = pointerY - dragState.startPointerY
      const distance = Math.hypot(deltaX, deltaY)

      if (!dragState.hasMoved && distance < DRAG_THRESHOLD) {
        return
      }

      if (!dragState.hasMoved) {
        dragState.hasMoved = true
      }

      const nextX = clampToRange(
        pointerX - dragState.offsetX,
        0,
        canvasBounds.width - NODE_SIZE,
      )
      const nextY = clampToRange(
        pointerY - dragState.offsetY,
        0,
        canvasBounds.height - NODE_SIZE,
      )

      setNodes((prev) =>
        prev.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                x: nextX,
                y: nextY,
              }
            : node,
        ),
      )
    }

    const handleMouseUp = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      dragStateRef.current = null
      setDraggingNodeId(null)

      if (!dragState.hasMoved) {
        return
      }

      suppressClickRef.current = true
      suppressCanvasClickRef.current = true

      const canvasBounds = canvasRef.current?.getBoundingClientRect()
      if (!canvasBounds) return

      const pointerX = event.clientX - canvasBounds.left
      const pointerY = event.clientY - canvasBounds.top
      const targetX = pointerX - dragState.offsetX
      const targetY = pointerY - dragState.offsetY

      setNodes((prev) => {
        const resolved = resolveDragPosition(
          targetX,
          targetY,
          dragState.nodeId,
          prev,
          canvasBounds.width,
          canvasBounds.height,
        )

        return prev.map((node) =>
          node.id === dragState.nodeId
            ? {
                ...node,
                x: resolved.x,
                y: resolved.y,
              }
            : node,
        )
      })

      setEditingNodeId(null)
      setDraftValue('')
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Filter input to an optional leading minus sign and digits only.
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(sanitizeNumericInput(event.target.value))
  }

  const handleFillMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMin(sanitizeNumericInput(event.target.value))
  }

  const handleFillMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMax(sanitizeNumericInput(event.target.value))
  }

  // Enforce max >= min after the user finishes editing.
  const syncFillRange = () => {
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)

    if (minValue !== null && maxValue !== null && maxValue < minValue) {
      setFillMax(String(minValue))
    }
  }

  // Treat Enter as "done editing" for the fill range inputs.
  const handleFillRangeKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      syncFillRange()
      event.currentTarget.blur()
    }
  }

  // Finalize node value from the latest input value to avoid stale state during fast typing.
  const commitNodeValue = (nodeId: string, rawValue: string) => {
    const trimmed = rawValue.trim()
    const nextValue = trimmed === '' ? null : Number(trimmed) // Empty string becomes null
    // Treat invalid numeric input as null so nodes never store NaN.
    const normalizedValue =
      nextValue === null || Number.isNaN(nextValue) ? null : nextValue

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              value: normalizedValue,
            }
          : node,
      ),
    )

    setEditingNodeId(null)
    setDraftValue('')
  }

  // Close edit mode without saving changes to the node value.
  const cancelEditing = () => {
    setEditingNodeId(null)
    setDraftValue('')
  }

  // Replace null node values with inclusive random integers in the provided range.
  const fillNullValues = () => {
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)

    if (minValue === null || maxValue === null) {
      return
    }

    const low = Math.min(minValue, maxValue)
    const high = Math.max(minValue, maxValue)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === null
          ? {
              ...node,
              value: getRandomIntInclusive(low, high),
            }
          : node,
      ),
    )
    cancelEditing()
  }

  // Nullify every node value after confirmation.
  const handleNullifyAllClick = () => {
    if (nodes.length === 0) {
      return
    }

    setShowNullifyConfirm(true)
  }

  const confirmNullifyAll = () => {
    setNodes((prev) =>
      prev.map((node) => ({
        ...node,
        value: null,
      })),
    )
    cancelEditing()
    setShowNullifyConfirm(false)
  }

  const cancelNullifyAll = () => {
    setShowNullifyConfirm(false)
  }

  // Keyboard shortcuts for inline editing: Enter to save, Escape to cancel.
  const handleValueKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    nodeId: string,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitNodeValue(nodeId, event.currentTarget.value)
    }

    if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  // Show confirmation dialog before clearing the entire canvas (only if there are nodes).
  const handleClearCanvas = () => {
    if (nodes.length === 0) {
      return
    }

    setShowClearConfirm(true)
  }

  // Confirm clearing: reset everything to initial state and clean up all UI.
  const confirmClearCanvas = () => {
    nextId.current = 1 // Reset ID counter for future node creation
    setNodes([])
    setEdges([])
    cancelEditing()
    setShowClearConfirm(false)
    closeContextMenu()
    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    clearSelection()
    clearEdgeSelection()
  }

  const cancelClearCanvas = () => {
    setShowClearConfirm(false)
  }

  const handlePresetClick = (preset: GraphPreset) => {
    // If there's already a graph, confirm before replacing it.
    if (nodes.length === 0) {
      applyPreset(preset)
      return
    }

    setPendingPreset(preset)
    setShowPresetConfirm(true)
  }

  const confirmPresetReplace = () => {
    // Apply the pending preset and close the confirmation modal.
    if (!pendingPreset) {
      setShowPresetConfirm(false)
      return
    }

    applyPreset(pendingPreset)
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  const cancelPresetReplace = () => {
    // Dismiss the preset confirmation without changing the canvas.
    setPendingPreset(null)
    setShowPresetConfirm(false)
  }

  // Create an edge between two nodes with validation to prevent duplicates and self-loops.
  const createEdge = (fromId: string, toId: string, direction: GraphEdge['direction']) => {
    // Prevent self-loops (a node cannot connect to itself)
    if (fromId === toId) {
      return
    }

    // Prevent duplicate edges in either direction
    // (we check both directions because edges can be bidirectional)
    const edgeExists = edges.some(
      (e) =>
        (e.fromNodeId === fromId && e.toNodeId === toId) ||
        (e.fromNodeId === toId && e.toNodeId === fromId),
    )

    if (edgeExists) {
      return
    }

    const newEdge: GraphEdge = {
      id: `edge-${nextId.current}`,
      fromNodeId: fromId,
      toNodeId: toId,
      direction,
    }

    nextId.current += 1
    setEdges((prev) => [...prev, newEdge])
  }

  // Cycle through edge directions: both-ways → one-way → reverse → both-ways (repeat)
  const toggleEdgeDirection = (edgeId: string) => {
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== edgeId) return edge

        const directionCycle = {
          both: 'forward',
          forward: 'backward',
          backward: 'both',
        } as const

        return {
          ...edge,
          direction: directionCycle[edge.direction],
        }
      }),
    )
  }

  // Two-stage connection: first click selects source, second click selects target and creates edge.
  const handleConnectNodeClick = (nodeId: string) => {
    if (!connectionSource) {
      // First click: remember which node we're connecting from
      setConnectionSource(nodeId)
    } else {
      // Second click: create edge from source to target, then reset
      createEdge(connectionSource, nodeId, newEdgeDirection)
      setConnectionSource(null)
    }
  }

  const cancelConnection = () => {
    setIsConnectMode(false)
    setConnectionSource(null)
  }

  // Delete button behavior: if already in delete mode with selections, delete them; otherwise toggle the mode.
  const handleDeleteModeToggle = () => {
    if (isDeleteMode) {
      if (selectedNodeIds.length > 0) {
        // Delete the selected nodes and exit delete mode
        deleteSelectedNodes(selectedNodeIds)
        setIsDeleteMode(false)
        clearSelection()
        return
      }

      // No selections, so just cancel delete mode
      exitDeleteMode()
      return
    }

    // Not in delete mode, so enter it
    enterDeleteMode()
  }

  const handleDeleteEdgeModeToggle = () => {
    if (isDeleteEdgeMode) {
      if (selectedEdgeIds.length > 0) {
        deleteSelectedEdges(selectedEdgeIds)
        setIsDeleteEdgeMode(false)
        clearEdgeSelection()
        return
      }

      exitDeleteEdgeMode()
      return
    }

    enterDeleteEdgeMode()
  }

  // Connect button behavior: toggle connect mode on/off.
  const handleConnectModeToggle = () => {
    if (isConnectMode) {
      // Already connecting, so cancel and reset
      cancelConnection()
      return
    }

    // Not connecting, so enter connect mode
    enterConnectMode()
  }

  const handleNewEdgeDirectionChange = (direction: GraphEdge['direction']) => {
    setNewEdgeDirection(direction)
  }

  const contextNode = contextMenu
    ? nodes.find((node) => node.id === contextMenu.nodeId) ?? null
    : null
  const fillRangeReady =
    parseNumberInput(fillMin) !== null &&
    parseNumberInput(fillMax) !== null
  const canFillNulls = nodes.length > 0 && fillRangeReady

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-title">DSA Visualizer</span>
          <span className="brand-subtitle">Build structures, then run algorithms.</span>
        </div>
        <nav className="structure-nav">
          <button className="btn btn-pill btn-active" type="button">
            Graph
          </button>
          <button className="btn btn-pill" type="button">
            Weighted Graph
          </button>
          <button className="btn btn-pill" type="button">
            Grid
          </button>
          <button className="btn btn-pill" type="button">
            Maze
          </button>
        </nav>
      </header>

      <div className="workspace">
        <section className="canvas-panel">
          <div className="canvas-header">
            <div className="canvas-copy">
              <h2>Graph Canvas</h2>
              <p>Place nodes and edges, then pick an algorithm on the right.</p>
            </div>
            <div className="canvas-actions">
              <button
                className={`btn btn-pill connect-toggle-btn ${isConnectMode ? 'btn-active' : ''}`}
                type="button"
                onClick={handleConnectModeToggle}
              >
                {isConnectMode ? 'Cancel connect' : 'Connect nodes'}
              </button>
              <div className="edge-direction-picker" aria-label="New edge direction">
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'forward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode}
                  aria-pressed={newEdgeDirection === 'forward'}
                  title="Create outbound edge (from selected node)"
                  onClick={() => handleNewEdgeDirectionChange('forward')}
                >
                  <DirectionIcon direction="forward" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'both' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode}
                  aria-pressed={newEdgeDirection === 'both'}
                  title="Create bidirectional edge"
                  onClick={() => handleNewEdgeDirectionChange('both')}
                >
                  <DirectionIcon direction="both" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'backward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode}
                  aria-pressed={newEdgeDirection === 'backward'}
                  title="Create inbound edge (toward selected node)"
                  onClick={() => handleNewEdgeDirectionChange('backward')}
                >
                  <DirectionIcon direction="backward" />
                </button>
              </div>
              <div className="delete-stack" role="group" aria-label="Delete controls">
                <button
                  className={`btn delete-stack-btn ${isDeleteMode ? 'btn-active' : ''}`}
                  type="button"
                  onClick={handleDeleteModeToggle}
                >
                  {isDeleteMode
                    ? selectedNodeIds.length > 0
                      ? 'Delete selected nodes'
                      : 'Cancel node delete'
                    : 'Delete nodes'}
                </button>
                <button
                  className={`btn delete-stack-btn ${isDeleteEdgeMode ? 'btn-active' : ''}`}
                  type="button"
                  onClick={handleDeleteEdgeModeToggle}
                >
                  {isDeleteEdgeMode
                    ? selectedEdgeIds.length > 0
                      ? 'Delete selected edges'
                      : 'Cancel edge delete'
                    : 'Delete edges'}
                </button>
              </div>
              <button className="btn btn-clear" type="button" onClick={handleClearCanvas}>
                Clear canvas
              </button>
            </div>
          </div>

          <div
            className={`canvas ${
              isConnectMode
                ? 'is-connect'
                : isDeleteMode || isDeleteEdgeMode
                  ? 'is-select'
                  : 'is-place'
            }`}
            ref={canvasRef}
            onClick={(e) => {
              if (!isConnectMode) {
                handleCanvasClick(e)
              }
            }}
            onContextMenu={handleCanvasContextMenu}
          >
            <svg className="edges-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: isDeleteEdgeMode ? 'auto' : 'none' }}>
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="7"
                  markerHeight="7"
                  refX="6.2"
                  refY="2.1"
                  orient="auto"
                >
                  <polygon points="0 0, 7 2.1, 0 4.2" fill="#4a7c59" />
                </marker>
                <marker
                  id="arrowhead-small"
                  markerWidth="5"
                  markerHeight="5"
                  refX="4.4"
                  refY="1.5"
                  orient="auto"
                >
                  <polygon points="0 0, 5 1.5, 0 3" fill="#4a7c59" />
                </marker>
                <marker
                  id="arrowhead-tiny"
                  markerWidth="3.8"
                  markerHeight="3.8"
                  refX="3.35"
                  refY="1.14"
                  orient="auto"
                >
                  <polygon points="0 0, 3.8 1.14, 0 2.28" fill="#4a7c59" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
                const toNode = nodes.find((n) => n.id === edge.toNodeId)

                if (!fromNode || !toNode) return null

                const geometry = getEdgeGeometry(fromNode, toNode)

                if (!geometry) return null

                const { startX, startY, endX, endY } = geometry
                const isSelected = selectedEdgeIds.includes(edge.id)
                const strokeColor = '#4a7c59'
                const strokeWidth = 2
                // Click handler for the invisible hit-line placed over the visual line.
                // This lets users reliably pick short/stationary edges without changing
                // the visual appearance of the edge itself.
                const handleEdgePick = (event: React.MouseEvent<SVGLineElement>) => {
                  if (!isDeleteEdgeMode) {
                    return
                  }

                  event.stopPropagation()
                  toggleEdgeSelection(edge.id)
                }
                const markerId =
                  geometry.edgeLength < TINY_EDGE_MARKER_EDGE_LENGTH
                    ? 'arrowhead-tiny'
                    : geometry.edgeLength < SHORT_EDGE_MARKER_EDGE_LENGTH
                      ? 'arrowhead-small'
                      : 'arrowhead'

                return (
                  <g key={edge.id}>
                    {(edge.direction === 'both' || edge.direction === 'forward') && (
                      <>
                        {isDeleteEdgeMode && isSelected && (
                          <line
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#2a4f9c"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.22"
                          />
                        )}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd={`url(#${markerId})`}
                        />
                        {isDeleteEdgeMode && (
                          // Invisible but pointer-active strokeline to expand hit area for selection.
                          // Keeps the visible line untouched while improving UX for small/close edges.
                          <line
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="transparent"
                            strokeWidth="12"
                            pointerEvents="stroke"
                            onClick={handleEdgePick}
                          />
                        )}
                      </>
                    )}
                    {edge.direction === 'both' && (
                      <>
                        {isDeleteEdgeMode && isSelected && (
                          <line
                            x1={endX}
                            y1={endY}
                            x2={startX}
                            y2={startY}
                            stroke="#2a4f9c"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.22"
                          />
                        )}
                        <line
                          x1={endX}
                          y1={endY}
                          x2={startX}
                          y2={startY}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd={`url(#${markerId})`}
                        />
                        {isDeleteEdgeMode && (
                          // Invisible hit area for the reverse-direction visual line.
                          <line
                            x1={endX}
                            y1={endY}
                            x2={startX}
                            y2={startY}
                            stroke="transparent"
                            strokeWidth="12"
                            pointerEvents="stroke"
                            onClick={handleEdgePick}
                          />
                        )}
                      </>
                    )}
                    {edge.direction === 'backward' && (
                      <>
                        {isDeleteEdgeMode && isSelected && (
                          <line
                            x1={endX}
                            y1={endY}
                            x2={startX}
                            y2={startY}
                            stroke="#2a4f9c"
                            strokeWidth="12"
                            strokeLinecap="round"
                            opacity="0.22"
                          />
                        )}
                        <line
                          x1={endX}
                          y1={endY}
                          x2={startX}
                          y2={startY}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          markerEnd={`url(#${markerId})`}
                        />
                        {isDeleteEdgeMode && (
                          <line
                            x1={endX}
                            y1={endY}
                            x2={startX}
                            y2={startY}
                            stroke="transparent"
                            strokeWidth="12"
                            pointerEvents="stroke"
                            onClick={handleEdgePick}
                          />
                        )}
                      </>
                    )}
                  </g>
                )
              })}
            </svg>

            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
              const toNode = nodes.find((n) => n.id === edge.toNodeId)

              if (!fromNode || !toNode) return null

              const geometry = getEdgeGeometry(fromNode, toNode)
              const isSelected = selectedEdgeIds.includes(edge.id)

              // Show the midpoint control when the edge is long enough for normal toggles.
              // However, when in delete-edge mode we want a midpoint badge even for short
              // edges so they can be selected — that's why the conditional permits showing
              // the control when `isDeleteEdgeMode` is active regardless of length.
              if (!geometry || (!isDeleteEdgeMode && geometry.edgeLength < MIN_TOGGLE_EDGE_LENGTH)) {
                return null
              }

              const { x1, y1, x2, y2 } = geometry
              const midX = (x1 + x2) / 2
              const midY = (y1 + y2) / 2

              const baseAngle = toDegrees(Math.atan2(y2 - y1, x2 - x1))
              const angle =
                edge.direction === 'backward'
                  ? baseAngle + 180
                  : baseAngle

              return (
                <button
                  key={`toggle-${edge.id}`}
                  className={`edge-toggle ${isSelected ? 'is-selected' : ''} ${isDeleteEdgeMode ? 'is-delete-edge-mode' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()

                    if (isDeleteEdgeMode) {
                      toggleEdgeSelection(edge.id)
                      return
                    }

                    toggleEdgeDirection(edge.id)
                  }}
                  type="button"
                  title={
                    isDeleteEdgeMode
                      ? isSelected
                        ? 'Remove edge from delete selection'
                        : 'Select edge for deletion'
                      : 'Toggle edge direction'
                  }
                  aria-label={
                    isDeleteEdgeMode
                      ? isSelected
                        ? 'Remove edge from delete selection'
                        : 'Select edge for deletion'
                      : 'Toggle edge direction'
                  }
                  style={{
                    left: midX,
                    top: midY,
                    ['--edge-angle' as never]: `${angle}deg`,
                  }}
                >
                  <span className="edge-toggle-icon">
                    {isDeleteEdgeMode ? <span className="edge-delete-badge">×</span> : <DirectionIcon direction={edge.direction === 'both' ? 'both' : 'forward'} />}
                  </span>
                </button>
              )
            })}

            {nodes.map((node) => (
              (() => {
                const display = formatNodeValue(node.value)
                const valueClass = display.sizeClass
                  ? `node-value ${display.sizeClass}`
                  : 'node-value'
                const isSelected = selectedNodeIds.includes(node.id)
                const isConnectionSource = connectionSource === node.id
                const showHoverValue =
                  node.value !== null && String(node.value).length > 5

                return (
              <div
                key={node.id}
                className={`node-wrap ${isConnectMode ? 'is-connect' : ''} ${isDeleteMode ? 'is-select' : ''} ${
                  isSelected ? 'is-selected' : ''
                } ${isConnectionSource ? 'is-source' : ''} ${
                  draggingNodeId === node.id ? 'is-dragging' : ''
                } ${editingNodeId === node.id ? 'is-editing' : ''}`}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
              >
                <div
                  className="node"
                  onMouseDown={(event) => handleNodeMouseDown(event, node)}
                  onClick={(event) => {
                    if (isConnectMode) {
                      event.stopPropagation()
                      handleConnectNodeClick(node.id)
                      return
                    }

                    if (isDeleteMode) {
                      event.stopPropagation()
                      toggleNodeSelection(node.id)
                      return
                    }

                    if (isDeleteEdgeMode) {
                      event.stopPropagation()
                      return
                    }

                    startEditingNode(event, node)
                  }}
                  onContextMenu={
                    isConnectMode || isDeleteMode || isDeleteEdgeMode
                      ? undefined
                      : (event) => handleNodeContextMenu(event, node)
                  }
                  style={{ cursor: undefined }}
                >
                  {editingNodeId === node.id ? (
                    <input
                      className="node-input"
                      inputMode="numeric"
                      value={draftValue}
                      onChange={handleValueChange}
                      onKeyDown={(event) => handleValueKeyDown(event, node.id)}
                      onBlur={(event) => commitNodeValue(node.id, event.currentTarget.value)}
                      autoFocus
                    />
                  ) : (
                    <span className={valueClass}>{display.text}</span>
                  )}
                </div>
                <span className="node-label">{node.label}</span>
                {showHoverValue && (
                  <span className="node-hover-value">{node.value}</span>
                )}
              </div>
                )
              })()
            ))}
          </div>
        </section>

        <aside className="sidebar">
          <div className="sidebar-section">
            <h3>Algorithm</h3>
            <div className="pill-group">
              <button className="btn btn-pill btn-active" type="button">
                BFS
              </button>
              <button className="btn btn-pill" type="button">
                DFS
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Inputs</h3>
            <label className="field">
              <span>Start node</span>
              <input type="text" placeholder="A" />
            </label>
            <label className="field">
              <span>Goal type</span>
              <select
                value={goalType}
                onChange={(event) => setGoalType(event.target.value as GoalType)}
              >
                <option value="target-node">Target node</option>
                <option value="target-value">Target value</option>
                <option value="max-value">Find max value</option>
                <option value="min-value">Find min value</option>
              </select>
            </label>
            {goalType === 'target-node' && (
              <label className="field">
                <span>Goal node</span>
                <input type="text" placeholder="F" />
              </label>
            )}
            {goalType === 'target-value' && (
              <label className="field">
                <span>Goal value</span>
                <input type="number" placeholder="10" />
              </label>
            )}
            {(goalType === 'max-value' || goalType === 'min-value') && (
              <p className="hint">No extra input needed for this goal.</p>
            )}
          </div>

          <div className="sidebar-section">
            <h3>Fill values</h3>
            <label className="field">
              <span>Minimum</span>
              <input
                type="text"
                inputMode="numeric"
                value={fillMin}
                onChange={handleFillMinChange}
                onBlur={syncFillRange}
                onKeyDown={handleFillRangeKeyDown}
              />
            </label>
            <label className="field">
              <span>Maximum</span>
              <input
                type="text"
                inputMode="numeric"
                value={fillMax}
                onChange={handleFillMaxChange}
                onBlur={syncFillRange}
                onKeyDown={handleFillRangeKeyDown}
              />
            </label>
            <div className="fill-actions">
              <button
                className="btn btn-primary"
                type="button"
                onClick={fillNullValues}
                disabled={!canFillNulls}
              >
                Fill null values
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleNullifyAllClick}
                disabled={nodes.length === 0}
              >
                Nullify all values
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Playback</h3>
            <div className="playback">
              <button className="btn btn-ghost" type="button">
                Play
              </button>
              <button className="btn btn-ghost" type="button">
                Pause
              </button>
              <button className="btn btn-ghost" type="button">
                Step
              </button>
            </div>
            <input className="slider" type="range" min="0" max="10" />
          </div>

          <div className="sidebar-section">
            <h3>Presets</h3>
            {GRAPH_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className="btn btn-ghost"
                type="button"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </aside>
      </div>

      {showClearConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Clear canvas?</h3>
            <p>This will remove all nodes from the canvas.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={confirmClearCanvas}>
                Clear
              </button>
              <button className="btn" type="button" onClick={cancelClearCanvas}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showPresetConfirm && pendingPreset && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Replace canvas with preset?</h3>
            <p>
              This will clear the current canvas and load “{pendingPreset.name}”.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={confirmPresetReplace}>
                Replace
              </button>
              <button className="btn" type="button" onClick={cancelPresetReplace}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showNullifyConfirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3>Nullify all values?</h3>
            <p>This will reset every node value to null.</p>
            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={confirmNullifyAll}>
                Nullify
              </button>
              <button className="btn" type="button" onClick={cancelNullifyAll}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && contextNode && (
        <div
          className="context-backdrop"
          onClick={closeContextMenu}
          onContextMenu={(event) => {
            event.preventDefault()
            closeContextMenu()
          }}
        >
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div className="context-header">
              <span className="context-title">Node {contextNode.label}</span>
              <span className="context-value">
                {contextNode.value === null ? 'null' : contextNode.value}
              </span>
            </div>
            {!isDeleteMode && (
              <>
                <button
                  className="context-action"
                  type="button"
                  onClick={() => {
                    beginEditingNode(contextNode)
                    closeContextMenu()
                  }}
                >
                  Edit value
                </button>
                <button
                  className="context-action context-action--danger"
                  type="button"
                  onClick={() => {
                    deleteNode(contextNode.id)
                    closeContextMenu()
                  }}
                >
                  Delete node
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App