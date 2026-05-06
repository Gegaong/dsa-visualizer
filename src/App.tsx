import { useEffect, useRef, useState } from 'react'
import './App.css'

import type {
  GraphNode,
  GoalType,
  ContextMenuState,
  GraphEdge,
  GraphPreset,
  DragState,
} from './types'

import {
  NODE_SIZE,
  NODE_RADIUS,
  MIN_TOGGLE_EDGE_LENGTH,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DRAG_THRESHOLD,
} from './utils/constants'

import {
  toDegrees,
  isOverlapping,
  clampToRange,
  resolveDragPosition,
  getEdgeGeometry,
} from './utils/geometry'

import {
  buildPresetGraph,
} from './utils/presets'

import {
  DirectionIcon,
} from './components/DirectionIcon'

import {
  GraphNodeLayer,
} from './components/NodesLayer'

import {
  Sidebar,
} from './components/Sidebar'

import {
  EdgesLayer,
} from './components/EdgesLayer'

import {
  sanitizeNumericInput,
  parseNumberInput,
  getRandomIntInclusive,
  reindexNodes,
} from './utils/format'

// Root component for the DSA visualizer workspace.
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
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const suppressCanvasClickRef = useRef(false)

  // Hide the node right-click menu.
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Replace the current graph with a centered preset.
  // Also resets every mode (connect/delete/edit) and clears all selections,
  // since the old node/edge IDs no longer exist after the swap.
  const applyPreset = (preset: GraphPreset) => {
    const canvasBounds = canvasElement?.getBoundingClientRect()
    const canvasWidth = canvasBounds?.width ?? DEFAULT_CANVAS_WIDTH
    const canvasHeight = canvasBounds?.height ?? DEFAULT_CANVAS_HEIGHT

    const { nodes: presetNodes, edges: presetEdges, nextId: nextCounter } =
      buildPresetGraph(preset, canvasWidth, canvasHeight)

    nextId.current = nextCounter
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

  // Delete the given edges from the canvas.
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

  // Clear the node-selection list (used in delete-node mode).
  const clearSelection = () => {
    setSelectedNodeIds([])
  }

  // Toggle an edge in the delete-edge selection.
  const toggleEdgeSelection = (edgeId: string) => {
    setSelectedEdgeIds((prev) =>
      prev.includes(edgeId) ? prev.filter((id) => id !== edgeId) : [...prev, edgeId],
    )
  }

  // Clear the edge-selection list (used in delete-edge mode).
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

  // Switch into delete-edge mode (turns off other modes first).
  const enterDeleteEdgeMode = () => {
    setIsConnectMode(false)
    setConnectionSource(null)
    setIsDeleteMode(false)
    clearSelection()
    setIsDeleteEdgeMode(true)
    clearEdgeSelection()
    closeContextMenu()
  }

  // Switch into connect mode (turns off other modes first).
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

  // Leave delete-node mode and clear its selection.
  const exitDeleteMode = () => {
    setIsDeleteMode(false)
    clearSelection()
  }

  // Leave delete-edge mode and clear its selection.
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

  // Add a new node at the click position.
  // Skipped if any mode is active (connect/delete) or if this click came
  // immediately after a drag (the suppress flag is set in handleMouseUp).
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

  // Begin a *potential* drag on a node.
  // We don't commit to "this is a drag" yet — we just stash the pointer offset.
  // The window-level mousemove listener decides if the pointer moves far enough
  // (DRAG_THRESHOLD pixels) to count as a drag instead of a click.
  const handleNodeMouseDown = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (event.button !== 0) {
      return
    }

    if (isConnectMode || isDeleteMode || isDeleteEdgeMode || editingNodeId === node.id) {
      return
    }

    const canvasElement = event.currentTarget.closest('.canvas') as HTMLDivElement | null
    const canvasBounds = canvasElement?.getBoundingClientRect()

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

  // Window-level mouse listeners that drive the node-dragging system.
  // We attach to window (not the canvas) so a drag survives even when the
  // cursor leaves the canvas area mid-drag.
  useEffect(() => {
    // Move the dragged node once the pointer has crossed the drag threshold.
    const handleMouseMove = (event: MouseEvent) => {
      const dragState = dragStateRef.current
      if (!dragState) return

      const canvasBounds = canvasElement?.getBoundingClientRect()
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

    // Finish the drag.
    // resolveDragPosition pushes the node away from neighbors so the minimum
    // spacing is preserved. The suppress flags prevent the trailing click
    // from being interpreted as "place a new node" or "start editing".
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

      const canvasBounds = canvasElement?.getBoundingClientRect()
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
  }, [canvasElement])

  // Filter input to an optional leading minus sign and digits only.
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftValue(sanitizeNumericInput(event.target.value))
  }

  // Sanitize the minimum-fill input as the user types.
  const handleFillMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFillMin(sanitizeNumericInput(event.target.value))
  }

  // Sanitize the maximum-fill input as the user types.
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

  // Replace every node value with null.
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

  // Close the nullify confirmation without nullifying.
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
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
  }

  // Close the clear-canvas confirmation without clearing.
  const cancelClearCanvas = () => {
    setShowClearConfirm(false)
  }

  // Load a preset, but ask first if there's already a graph on the canvas.
  const handlePresetClick = (preset: GraphPreset) => {
    // If there's already a graph, confirm before replacing it.
    if (nodes.length === 0) {
      applyPreset(preset)
      return
    }

    setPendingPreset(preset)
    setShowPresetConfirm(true)
  }

  // Apply the pending preset and close the confirmation.
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

  // Close the preset-replace confirmation without replacing.
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

  // Leave connect mode and forget the chosen source node.
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

  // Edge-delete button: delete the selection if any, otherwise toggle the mode.
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

  // Set the direction used for new edges created in connect mode.
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
            className={`canvas ${isConnectMode
              ? 'is-connect'
              : isDeleteMode || isDeleteEdgeMode
                ? 'is-select'
                : 'is-place'
              }`}
            ref={setCanvasElement}
            onClick={(e) => {
              if (!isConnectMode) {
                handleCanvasClick(e)
              }
            }}
            onContextMenu={handleCanvasContextMenu}
          >
            <EdgesLayer
              nodes={nodes}
              edges={edges}
              isDeleteEdgeMode={isDeleteEdgeMode}
              selectedEdgeIds={selectedEdgeIds}
              onToggleEdgeSelection={toggleEdgeSelection}
            />

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

            <GraphNodeLayer
              nodes={nodes}
              isConnectMode={isConnectMode}
              isDeleteMode={isDeleteMode}
              isDeleteEdgeMode={isDeleteEdgeMode}
              selectedNodeIds={selectedNodeIds}
              connectionSource={connectionSource}
              draggingNodeId={draggingNodeId}
              editingNodeId={editingNodeId}
              draftValue={draftValue}
              onNodeMouseDown={handleNodeMouseDown}
              onConnectNodeClick={handleConnectNodeClick}
              onToggleNodeSelection={toggleNodeSelection}
              onStartEditingNode={startEditingNode}
              onNodeContextMenu={handleNodeContextMenu}
              onValueChange={handleValueChange}
              onValueKeyDown={handleValueKeyDown}
              onCommitNodeValue={commitNodeValue}
            />
          </div>
        </section>

        <Sidebar
          goalType={goalType}
          onGoalTypeChange={setGoalType}
          fillMin={fillMin}
          fillMax={fillMax}
          onFillMinChange={handleFillMinChange}
          onFillMaxChange={handleFillMaxChange}
          onFillRangeBlur={syncFillRange}
          onFillRangeKeyDown={handleFillRangeKeyDown}
          onFillNullValues={fillNullValues}
          canFillNulls={canFillNulls}
          onNullifyAll={handleNullifyAllClick}
          canNullify={nodes.length > 0}
          onPresetClick={handlePresetClick}
        />
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