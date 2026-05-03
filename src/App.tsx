import { useRef, useState } from 'react'
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

const NODE_SIZE = 48
const NODE_RADIUS = NODE_SIZE / 2

const toDegrees = (radians: number) => (radians * 180) / Math.PI

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
    return { text: '', sizeClass: '' }
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
  const minDistance = NODE_SIZE // Minimum distance between centers (both radii)

  return list.some((node) => {
    const existingCenterX = node.x + NODE_RADIUS
    const existingCenterY = node.y + NODE_RADIUS
    const dx = existingCenterX - newCenterX
    const dy = existingCenterY - newCenterY

    // Use squared distance to avoid sqrt() overhead
    return dx * dx + dy * dy < minDistance * minDistance
  })
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

function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('') // Temporary input value during inline editing
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [isDeleteMode, setIsDeleteMode] = useState(false)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [isConnectMode, setIsConnectMode] = useState(false)
  const [connectionSource, setConnectionSource] = useState<string | null>(null)
  const [newEdgeDirection, setNewEdgeDirection] = useState<GraphEdge['direction']>('both')
  // useRef instead of useState: changing nextId doesn't trigger a re-render (we only use it for ID generation)
  const nextId = useRef(1)

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Delete a single node and all its connected edges, then recalculate node labels.
  const deleteNode = (nodeId: string) => {
    setNodes((prev) => reindexNodes(prev.filter((node) => node.id !== nodeId)))
    setEdges((prev) =>
      prev.filter((edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId),
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
  }

  // Toggle a node's selected state for delete mode (add or remove from selection list).
  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId],
    )
  }

  const clearSelection = () => {
    setSelectedNodeIds([])
  }

  // Mode management: Connect and Delete are mutually exclusive.
  // When entering one mode, we automatically exit the other and clean up.
  const enterDeleteMode = () => {
    setIsConnectMode(false) // Exit connect mode first
    setConnectionSource(null)
    setIsDeleteMode(true)
    clearSelection()
    closeContextMenu()
  }

  const enterConnectMode = () => {
    setIsDeleteMode(false) // Exit delete mode first
    clearSelection()
    setIsConnectMode(true)
    setConnectionSource(null)
    setNewEdgeDirection('both')
    closeContextMenu()
  }

  const exitDeleteMode = () => {
    setIsDeleteMode(false)
    clearSelection()
  }

  // Enter inline-editing mode for a node's value. Cancel any active modes and prep the input field.
  const beginEditingNode = (node: GraphNode) => {
    setIsDeleteMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    setEditingNodeId(node.id)
    setDraftValue(node.value === null ? '' : String(node.value))
  }

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (contextMenu) {
      closeContextMenu()
    }

    if (isDeleteMode || isConnectMode) {
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

    event.stopPropagation()
    beginEditingNode(node)
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

  // Filter out non-numeric characters as the user types (numeric-only input).
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/[^0-9]/g, '') // Keep only 0-9
    setDraftValue(nextValue)
  }

  // Finalize node value from the draft input: save to nodes array and close edit mode.
  const commitNodeValue = (nodeId: string) => {
    const trimmed = draftValue.trim()
    const nextValue = trimmed === '' ? null : Number(trimmed) // Empty string becomes null

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              value: nextValue,
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

  // Keyboard shortcuts for inline editing: Enter to save, Escape to cancel.
  const handleValueKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    nodeId: string,
  ) => {
    if (event.key === 'Enter') {
      commitNodeValue(nodeId)
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
    clearSelection()
  }

  const cancelClearCanvas = () => {
    setShowClearConfirm(false)
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
                className={`btn btn-pill ${isConnectMode ? 'btn-active' : ''}`}
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
              <button
                className={`btn btn-pill ${isDeleteMode ? 'btn-active' : ''}`}
                type="button"
                onClick={handleDeleteModeToggle}
              >
                {isDeleteMode
                  ? selectedNodeIds.length > 0
                    ? 'Delete selected'
                    : 'Cancel delete'
                  : 'Delete nodes'}
              </button>
              <button className="btn btn-clear" type="button" onClick={handleClearCanvas}>
                Clear canvas
              </button>
            </div>
          </div>

          <div
            className={`canvas ${
              isConnectMode ? 'is-connect' : isDeleteMode ? 'is-select' : 'is-place'
            }`}
            onClick={(e) => {
              if (!isConnectMode) {
                handleCanvasClick(e)
              }
            }}
            onContextMenu={handleCanvasContextMenu}
          >
            <svg className="edges-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
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
              </defs>
              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
                const toNode = nodes.find((n) => n.id === edge.toNodeId)

                if (!fromNode || !toNode) return null

                const x1 = fromNode.x + NODE_RADIUS
                const y1 = fromNode.y + NODE_RADIUS
                const x2 = toNode.x + NODE_RADIUS
                const y2 = toNode.y + NODE_RADIUS

                const dx = x2 - x1
                const dy = y2 - y1
                const dist = Math.sqrt(dx * dx + dy * dy)

                const ratio = NODE_RADIUS / dist
                const startX = x1 + dx * ratio
                const startY = y1 + dy * ratio
                const endX = x2 - dx * ratio
                const endY = y2 - dy * ratio

                return (
                  <g key={edge.id}>
                    {(edge.direction === 'both' || edge.direction === 'forward') && (
                      <line
                        x1={startX}
                        y1={startY}
                        x2={endX}
                        y2={endY}
                        stroke="#4a7c59"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    )}
                    {edge.direction === 'both' && (
                      <line
                        x1={endX}
                        y1={endY}
                        x2={startX}
                        y2={startY}
                        stroke="#4a7c59"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    )}
                    {edge.direction === 'backward' && (
                      <line
                        x1={endX}
                        y1={endY}
                        x2={startX}
                        y2={startY}
                        stroke="#4a7c59"
                        strokeWidth="2"
                        markerEnd="url(#arrowhead)"
                      />
                    )}
                  </g>
                )
              })}
            </svg>

            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.fromNodeId)
              const toNode = nodes.find((n) => n.id === edge.toNodeId)

              if (!fromNode || !toNode) return null

              const x1 = fromNode.x + NODE_RADIUS
              const y1 = fromNode.y + NODE_RADIUS
              const x2 = toNode.x + NODE_RADIUS
              const y2 = toNode.y + NODE_RADIUS

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
                  className="edge-toggle"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleEdgeDirection(edge.id)
                  }}
                  type="button"
                  title="Toggle edge direction"
                  aria-label="Toggle edge direction"
                  style={{
                    left: midX,
                    top: midY,
                    ['--edge-angle' as never]: `${angle}deg`,
                  }}
                >
                  <span className="edge-toggle-icon">
                    <DirectionIcon direction={edge.direction === 'both' ? 'both' : 'forward'} />
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
                } ${isConnectionSource ? 'is-source' : ''}`}
                style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
              >
                <div
                  className="node"
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

                    startEditingNode(event, node)
                  }}
                  onContextMenu={
                    isConnectMode || isDeleteMode ? undefined : (event) => handleNodeContextMenu(event, node)
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
                      onBlur={() => commitNodeValue(node.id)}
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
            <button className="btn btn-ghost" type="button">
              Default graph
            </button>
            <button className="btn btn-ghost" type="button">
              Random small
            </button>
            <button className="btn btn-ghost" type="button">
              Random medium
            </button>
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
                {contextNode.value === null ? 'Empty' : contextNode.value}
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