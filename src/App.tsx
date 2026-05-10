import { useCallback, useEffect, useRef, useState } from 'react'
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
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DRAG_THRESHOLD,
} from './utils/constants'

import {
  isOverlapping,
  clampToRange,
  resolveDragPosition,
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
  Header,
} from './components/Header'

import {
  EdgeToggles,
} from './components/EdgeToggles'

import {
  ConfirmModal,
} from './components/Modals'

import {
  NodeContextMenu,
} from './components/NodeContextMenu'

import {
  sanitizeNumericInput,
  parseNumberInput,
  getRandomIntInclusive,
  reindexNodes,
} from './utils/format'
import {
  canCreateEdge,
  getNextAllowedEdgeDirection,
  sanitizeEdgesForNullNodes,
} from './utils/graphRules'
import { runBfs } from './algorithms/bfs'
import { runDfs } from './algorithms/dfs'
import type { BfsResult } from './algorithms/types'
import { buildBfsCompletionStatus, prepareBfsRunInputs } from './algorithms/bfsUIHelpers'
import { buildDfsCompletionStatus, prepareDfsRunInputs } from './algorithms/dfsUIHelpers'

type GraphAlgorithmTab = 'bfs' | 'dfs'

// Root component for the DSA visualizer workspace.
function App() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [goalType, setGoalType] = useState<GoalType>('target-node')
  const [startNodeLabel, setStartNodeLabel] = useState('')
  const [goalNodeLabel, setGoalNodeLabel] = useState('')
  const [goalValueInput, setGoalValueInput] = useState('')
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState('') // Temporary input value during inline editing
  const [fillMin, setFillMin] = useState('1')
  const [fillMax, setFillMax] = useState('10')
  const [showEmptyAllConfirm, setShowEmptyAllConfirm] = useState(false)
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
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [algorithmTab, setAlgorithmTab] = useState<GraphAlgorithmTab>('bfs')
  const [traversalVisitedNodeIds, setTraversalVisitedNodeIds] = useState<string[]>([])
  const [traversalCurrentNodeId, setTraversalCurrentNodeId] = useState<string | null>(null)
  const [traversalStartNodeId, setTraversalStartNodeId] = useState<string | null>(null)
  const [traversalGoalNodeIds, setTraversalGoalNodeIds] = useState<string[]>([])
  const [traversalStatusText, setTraversalStatusText] = useState('Enter start and goal, then run the selected algorithm.')
  const [isTraversalRunning, setIsTraversalRunning] = useState(false)
  const [isTraversalPlaying, setIsTraversalPlaying] = useState(false)
  const [traversalPlaybackSpeed, setTraversalPlaybackSpeed] = useState(55)
  const [traversalStepIndex, setTraversalStepIndex] = useState(-1)
  const [traversalResult, setTraversalResult] = useState<BfsResult | null>(null)
  // useRef instead of useState: changing nextId doesn't trigger a re-render (we only use it for ID generation)
  const nextId = useRef(1)
  const [canvasElement, setCanvasElement] = useState<HTMLDivElement | null>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const traversalPlaybackTimerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const suppressCanvasClickRef = useRef(false)
  const CANVAS_ZOOM_MIN = 0.5
  const CANVAS_ZOOM_MAX = 2
  const CANVAS_ZOOM_STEP = 0.1
  const TRAVERSAL_PLAYBACK_MIN_DELAY = 80
  const TRAVERSAL_PLAYBACK_MAX_DELAY = 1300

  // Hide the node right-click menu.
  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // Keep zoom values inside the supported range.
  const clampCanvasZoom = (value: number) => {
    return Math.min(CANVAS_ZOOM_MAX, Math.max(CANVAS_ZOOM_MIN, value))
  }

  // Convert client coordinates into canvas-space coordinates for the current zoom level.
  const getCanvasPointerPosition = useCallback(
    (clientX: number, clientY: number, canvasBounds: DOMRect) => {
      const centerX = canvasBounds.width / 2
      const centerY = canvasBounds.height / 2
      const pointerX = clientX - canvasBounds.left
      const pointerY = clientY - canvasBounds.top

      return {
        x: (pointerX - (1 - canvasZoom) * centerX) / canvasZoom,
        y: (pointerY - (1 - canvasZoom) * centerY) / canvasZoom,
      }
    },
    [canvasZoom],
  )

  // Increase zoom by one step.
  const handleZoomIn = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev + CANVAS_ZOOM_STEP))
  }

  // Decrease zoom by one step.
  const handleZoomOut = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    setCanvasZoom((prev) => clampCanvasZoom(prev - CANVAS_ZOOM_STEP))
  }

  // Stop any running traversal playback timer.
  const stopTraversalPlayback = () => {
    if (traversalPlaybackTimerRef.current !== null) {
      window.clearInterval(traversalPlaybackTimerRef.current)
      traversalPlaybackTimerRef.current = null
    }
    setIsTraversalPlaying(false)
  }

  // Clear traversal visual state and reset the idle status line (BFS or DFS).
  const resetTraversalVisualization = (idleAlgorithm: GraphAlgorithmTab = algorithmTab) => {
    stopTraversalPlayback()
    setTraversalVisitedNodeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalStartNodeId(null)
    setTraversalGoalNodeIds([])
    setTraversalResult(null)
    setTraversalStepIndex(-1)
    const algoName = idleAlgorithm === 'dfs' ? 'DFS' : 'BFS'
    setTraversalStatusText(`Enter start and goal, then run ${algoName}.`)
    setIsTraversalRunning(false)
  }

  // Switch BFS/DFS in the sidebar; clears any in-progress traversal UI.
  const handleAlgorithmTabChange = (tab: GraphAlgorithmTab) => {
    if (isTraversalRunning) return
    if (tab === algorithmTab) return
    setAlgorithmTab(tab)
    resetTraversalVisualization(tab)
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
    if (isTraversalRunning) return // Block graph edits while a traversal run is active.
    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    if (nodeIds.length === 0) {
      return
    }

    resetTraversalVisualization()
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
  // Block edits while a traversal run is active (same guard as other graph mutators).
  const deleteSelectedEdges = (edgeIds: string[]) => {
    if (isTraversalRunning) return
    if (edgeIds.length === 0) {
      return
    }

    resetTraversalVisualization()
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
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    setIsDeleteMode(false)
    clearSelection()
  }

  // Leave delete-edge mode and clear its selection.
  const exitDeleteEdgeMode = () => {
    if (isTraversalRunning) return
    setIsDeleteEdgeMode(false)
    clearEdgeSelection()
  }

  // Enter inline-editing mode for a node's value. Cancel any active modes and prep the input field.
  // If a different node is already being edited, commit its draft first — clicking
  // straight from one node into another would otherwise silently drop the typed value
  // (the input unmounts before React fires onBlur).
  const beginEditingNode = (node: GraphNode) => {
    if (isTraversalRunning) return
    if (editingNodeId === node.id) {
      return
    }

    if (editingNodeId && editingNodeId !== node.id) {
      commitNodeValue(editingNodeId, draftValue)
    }

    setIsDeleteMode(false)
    setIsDeleteEdgeMode(false)
    setIsConnectMode(false)
    setConnectionSource(null)
    clearSelection()
    clearEdgeSelection()
    setEditingNodeId(node.id)
    setDraftValue(typeof node.value === 'number' ? String(node.value) : '')
  }

  // Add a new node at the click position.
  // Skipped if any mode is active (connect/delete) or if this click came
  // immediately after a drag (the suppress flag is set in handleMouseUp).
  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isTraversalRunning) return
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
    const pointer = getCanvasPointerPosition(event.clientX, event.clientY, rect)
    const rawX = pointer.x
    const rawY = pointer.y
    const clampedX = Math.min(Math.max(0, rawX - NODE_RADIUS), rect.width - NODE_SIZE)
    const clampedY = Math.min(Math.max(0, rawY - NODE_RADIUS), rect.height - NODE_SIZE)

    setNodes((prev) => {
      if (isOverlapping(clampedX, clampedY, prev)) {
        return prev
      }

      const newNode: GraphNode = {
        id: `node-${nextId.current}`,
        label: '',
        value: 'empty',
        x: clampedX,
        y: clampedY,
      }

      nextId.current += 1
      return reindexNodes([...prev, newNode])
    })
  }

  // Block the browser's default right-click menu and close any open custom menus.
  const handleCanvasContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isTraversalRunning) return
    event.preventDefault()
    closeContextMenu()
  }

  // Start editing a node when clicked (unless in delete mode).
  const startEditingNode = (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => {
    if (isTraversalRunning) return
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

    // While editing this node, swallow shell clicks so the input doesn't blur
    // when the user clicks near the edge of the circle.
    if (editingNodeId === node.id) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    if (isConnectMode || isDeleteMode || isDeleteEdgeMode) {
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

    // If another node is being edited, commit it immediately when dragging starts.
    if (editingNodeId !== null && editingNodeId !== node.id) {
      const nodeId = editingNodeId
      const normalizedValue = parseNumberInput(draftValue)
      setNodes((prev) =>
        prev.map((currentNode) =>
          currentNode.id === nodeId ? { ...currentNode, value: normalizedValue } : currentNode,
        ),
      )
      setEditingNodeId(null)
      setDraftValue('')
    }

    const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
    dragStateRef.current = {
      nodeId: node.id,
      offsetX: pointer.x - node.x,
      offsetY: pointer.y - node.y,
      startPointerX: pointer.x,
      startPointerY: pointer.y,
      hasMoved: false,
    }
    setDraggingNodeId(node.id)
  }

  // Open a context menu for a node's right-click. Clamp menu position to stay on-screen.
  const handleNodeContextMenu = (
    event: React.MouseEvent<HTMLDivElement>,
    node: GraphNode,
  ) => {
    if (isTraversalRunning) return
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

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const pointerX = pointer.x
      const pointerY = pointer.y
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

      const pointer = getCanvasPointerPosition(event.clientX, event.clientY, canvasBounds)
      const pointerX = pointer.x
      const pointerY = pointer.y
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
  }, [canvasElement, getCanvasPointerPosition])

  useEffect(() => () => {
    stopTraversalPlayback()
  }, [])

  // Filter input to an optional leading minus sign and digits only.
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
    const normalizedValue = parseNumberInput(rawValue)

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

    if (normalizedValue === null) {
      setEdges((prev) => sanitizeEdgesForNullNodes(prev, [nodeId]))
    }
  }

  // Close edit mode without saving changes to the node value.
  const cancelEditing = () => {
    setEditingNodeId(null)
    setDraftValue('')
  }

  // Replace empty node values with inclusive random integers in the provided range.
  const fillEmptyValues = () => {
    if (isTraversalRunning) return
    resetTraversalVisualization()
    const minValue = parseNumberInput(fillMin)
    const maxValue = parseNumberInput(fillMax)

    if (minValue === null || maxValue === null) {
      return
    }

    const low = Math.min(minValue, maxValue)
    const high = Math.max(minValue, maxValue)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === 'empty'
          ? {
            ...node,
            value: getRandomIntInclusive(low, high),
          }
          : node,
      ),
    )
    cancelEditing()
  }

  // Convert every empty node to null. No confirmation — this leaves user-entered
  // numbers untouched, so it's non-destructive.
  const nullifyEmptyValues = () => {
    if (isTraversalRunning) return
    resetTraversalVisualization()
    const nullifiedNodeIds = nodes
      .filter((node) => node.value === 'empty')
      .map((node) => node.id)

    setNodes((prev) =>
      prev.map((node) =>
        node.value === 'empty'
          ? { ...node, value: null }
          : node,
      ),
    )

    if (nullifiedNodeIds.length > 0) {
      setEdges((prev) => sanitizeEdgesForNullNodes(prev, nullifiedNodeIds))
    }
  }

  // Ask before resetting every node back to empty — this *can* wipe user-entered numbers.
  const handleEmptyAllClick = () => {
    if (isTraversalRunning) return
    if (nodes.every((node) => node.value === 'empty')) {
      return
    }

    setShowEmptyAllConfirm(true)
  }

  // Reset every node to the 'empty' state.
  const confirmEmptyAll = () => {
    if (isTraversalRunning) return
    resetTraversalVisualization()
    setNodes((prev) =>
     prev.map((node): GraphNode => ({
        ...node,
        value: 'empty',
      })),
    )
    cancelEditing()
    setShowEmptyAllConfirm(false)
  }

  // Close the empty-all confirmation without resetting.
  const cancelEmptyAll = () => {
    setShowEmptyAllConfirm(false)
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
    if (isTraversalRunning) return
    if (nodes.length === 0) {
      return
    }

    setShowClearConfirm(true)
  }

  // Confirm clearing: reset everything to initial state and clean up all UI.
  const confirmClearCanvas = () => {
    if (isTraversalRunning) return
    resetTraversalVisualization()
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
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
    // Apply the pending preset and close the confirmation modal.
    if (!pendingPreset) {
      setShowPresetConfirm(false)
      return
    }

    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    if (!canCreateEdge(nodes, edges, fromId, toId, direction)) {
      return
    }

    resetTraversalVisualization()
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
    if (isTraversalRunning) return
    resetTraversalVisualization()
    setEdges((prev) =>
      prev.map((edge) => {
        if (edge.id !== edgeId) return edge
        const nextDirection = getNextAllowedEdgeDirection(edge, nodes)

        return {
          ...edge,
          direction: nextDirection,
        }
      }),
    )
  }

  // Two-stage connection: first click selects source, second click selects target and creates edge.
  const handleConnectNodeClick = (nodeId: string) => {
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
    setIsConnectMode(false)
    setConnectionSource(null)
  }

  // Delete button behavior: if already in delete mode with selections, delete them; otherwise toggle the mode.
  const handleDeleteModeToggle = () => {
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
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
    if (isTraversalRunning) return
    setNewEdgeDirection(direction)
  }

  // Normalize goal-dependent inputs whenever the goal mode changes.
  const handleGoalTypeChange = (type: GoalType) => {
    resetTraversalVisualization()
    setGoalType(type)
    setGoalNodeLabel('')
    setGoalValueInput('')
  }

  // Clear old traversal highlights when the user starts changing algorithm inputs.
  const handleStartNodeLabelChange = (value: string) => {
    resetTraversalVisualization()
    setStartNodeLabel(value.toUpperCase())
  }

  // Clear old traversal highlights when the user edits target-node input.
  const handleGoalNodeLabelChange = (value: string) => {
    resetTraversalVisualization()
    setGoalNodeLabel(value.toUpperCase())
  }

  // Clear old traversal highlights when the user edits target-value input.
  const handleGoalValueInputChange = (value: string) => {
    resetTraversalVisualization()
    setGoalValueInput(sanitizeNumericInput(value))
  }

  // Apply end-of-run traversal status and final result highlighting.
  const finalizeTraversalRun = (result: BfsResult) => {
    stopTraversalPlayback()
    setTraversalCurrentNodeId(null)
    setTraversalStepIndex(result.steps.length - 1)

    if (!result.foundNodeLabel) {
      setTraversalStatusText('Done. Goal not found in reachable nodes.')
      return
    }

    if (result.foundNodeIds.length > 0) {
      setTraversalGoalNodeIds(result.foundNodeIds)
    }
    if (algorithmTab === 'dfs') {
      setTraversalStatusText(buildDfsCompletionStatus(result, nodes))
    } else {
      setTraversalStatusText(buildBfsCompletionStatus(result, nodes))
    }
  }

  // Render one traversal step index by updating "current" node and visited history.
  const applyTraversalStepIndex = (result: BfsResult, index: number) => {
    const algoName = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
    if (index < 0) {
      setTraversalCurrentNodeId(null)
      setTraversalVisitedNodeIds([])
      setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
      return
    }

    const boundedIndex = Math.min(index, result.steps.length - 1)
    const currentStep = result.steps[boundedIndex]
    const visitedIds = result.steps.slice(0, boundedIndex + 1).map((step) => step.nodeId)

    setTraversalCurrentNodeId(currentStep.nodeId)
    setTraversalVisitedNodeIds(visitedIds)
    setTraversalStatusText(
      `Visiting ${currentStep.nodeLabel} (step ${currentStep.order}/${result.steps.length})`,
    )
  }

  // Move playback one step forward, and finalize when traversal reaches the end.
  const stepTraversalForward = () => {
    if (!traversalResult) return

    const nextIndex = traversalStepIndex + 1
    if (nextIndex >= traversalResult.steps.length) {
      finalizeTraversalRun(traversalResult)
      return
    }

    applyTraversalStepIndex(traversalResult, nextIndex)
    setTraversalStepIndex(nextIndex)
  }

  // Move playback one step backward without changing the current traversal result.
  const stepTraversalBackward = () => {
    if (!traversalResult) return
    if (traversalStepIndex < 0) return

    const previousIndex = traversalStepIndex - 1
    applyTraversalStepIndex(traversalResult, previousIndex)
    setTraversalStepIndex(previousIndex)
    setIsTraversalRunning(true)
    setTraversalGoalNodeIds([])
  }

  // Convert slider value to timer delay so higher slider means faster playback.
  const getTraversalPlaybackDelay = (speedValue: number) => {
    const speedRatio = speedValue / 100
    return Math.round(
      TRAVERSAL_PLAYBACK_MAX_DELAY - speedRatio * (TRAVERSAL_PLAYBACK_MAX_DELAY - TRAVERSAL_PLAYBACK_MIN_DELAY),
    )
  }

  // Advance playback by one step and finish when the traversal reaches the end.
  const advanceTraversalPlaybackStep = (result: BfsResult, currentIndex: number) => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= result.steps.length) {
      finalizeTraversalRun(result)
      return result.steps.length - 1
    }

    applyTraversalStepIndex(result, nextIndex)
    return nextIndex
  }

  // Start or restart the traversal playback timer with the provided delay.
  const startTraversalPlaybackTimer = (result: BfsResult, delayMs: number) => {
    if (traversalPlaybackTimerRef.current !== null) {
      window.clearInterval(traversalPlaybackTimerRef.current)
      traversalPlaybackTimerRef.current = null
    }

    traversalPlaybackTimerRef.current = window.setInterval(() => {
      setTraversalStepIndex((currentIndex) => advanceTraversalPlaybackStep(result, currentIndex))
    }, delayMs)
  }

  // Start or resume automated traversal playback using the selected speed.
  const playTraversal = () => {
    if (!traversalResult) return
    if (isTraversalPlaying) return

    if (traversalStepIndex >= traversalResult.steps.length - 1) {
      applyTraversalStepIndex(traversalResult, -1)
      setTraversalStepIndex(-1)
      setTraversalGoalNodeIds([])
      setIsTraversalRunning(true)
    }

    setIsTraversalPlaying(true)
    startTraversalPlaybackTimer(traversalResult, getTraversalPlaybackDelay(traversalPlaybackSpeed))
  }

  // Pause automated traversal playback and keep current step visible.
  const pauseTraversal = () => {
    stopTraversalPlayback()
  }

  // Change traversal playback speed from the slider.
  const handleTraversalPlaybackSpeedChange = (value: number) => {
    const clampedValue = Math.min(100, Math.max(0, value))
    setTraversalPlaybackSpeed(clampedValue)

    if (!isTraversalPlaying || !traversalResult) {
      return
    }

    startTraversalPlaybackTimer(traversalResult, getTraversalPlaybackDelay(clampedValue))
  }

  // Validate sidebar inputs, run BFS or DFS, and prepare step playback on the canvas.
  const runTraversalFromSidebar = () => {
    if (isTraversalPlaying) return
    stopTraversalPlayback()
    setTraversalVisitedNodeIds([])
    setTraversalCurrentNodeId(null)
    setTraversalGoalNodeIds([])

    const preparation =
      algorithmTab === 'dfs'
        ? prepareDfsRunInputs({
          nodes,
          goalType,
          startNodeLabel,
          goalNodeLabel,
          goalValueInput,
        })
        : prepareBfsRunInputs({
          nodes,
          goalType,
          startNodeLabel,
          goalNodeLabel,
          goalValueInput,
        })

    if (preparation.ok === false) {
      setTraversalStatusText(preparation.error)
      return
    }
    setTraversalGoalNodeIds(preparation.initialGoalNodeIds)
    setTraversalStartNodeId(preparation.startNode.id)

    const runInput = {
      nodes,
      edges,
      startNodeLabel: preparation.startNode.label,
      goal: preparation.goal,
    }
    const result = algorithmTab === 'dfs' ? runDfs(runInput) : runBfs(runInput)

    if (result.steps.length === 0) {
      const algoName = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
      setTraversalStatusText(`${algoName} could not start with the current graph and inputs.`)
      return
    }

    setTraversalResult(result)
    setTraversalStepIndex(-1)
    setIsTraversalRunning(true)
    const algoName = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
    setTraversalStatusText(`${algoName} ready. Press Play or step through manually.`)
  }

  const hasEmptyNodes = nodes.some((node) => node.value === 'empty')
  const hasNonEmptyNodes = nodes.some((node) => node.value !== 'empty')
  const fillRangeReady =
    parseNumberInput(fillMin) !== null &&
    parseNumberInput(fillMax) !== null
  const canFillEmpty = hasEmptyNodes && fillRangeReady
  const canNullifyEmpty = hasEmptyNodes
  const canEmptyAll = hasNonEmptyNodes
  const canRunTraversal =
    nodes.length > 0 &&
    !hasEmptyNodes &&
    startNodeLabel.trim() !== '' &&
    (goalType !== 'target-node' || goalNodeLabel.trim() !== '') &&
    (goalType !== 'target-value' || parseNumberInput(goalValueInput) !== null)
  const canStepBackward = traversalResult !== null && traversalStepIndex >= 0 && !isTraversalPlaying
  const canStepForward = traversalResult !== null && traversalStepIndex < traversalResult.steps.length - 1 && !isTraversalPlaying
  const canTogglePlay = traversalResult !== null
  const isTraversalPlaybackComplete =
    traversalResult !== null && traversalStepIndex >= traversalResult.steps.length - 1 && !isTraversalPlaying
  let sidebarTraversalStatusText = traversalStatusText
  const startNodeMissing = startNodeLabel.trim() === ''
  const goalNodeMissing = goalType === 'target-node' && goalNodeLabel.trim() === ''
  const goalValueMissing = goalType === 'target-value' && parseNumberInput(goalValueInput) === null
  if (startNodeMissing && goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal node are required fields.'
  } else if (startNodeMissing && goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Start node and Goal value are required fields.'
  } else if (startNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Start node is a required field.'
  } else if (goalNodeMissing) {
    sidebarTraversalStatusText = 'Warning: Goal node is a required field.'
  } else if (goalValueMissing) {
    sidebarTraversalStatusText = 'Warning: Goal value is a required field.'
  } else if (hasEmptyNodes) {
    const algoName = algorithmTab === 'dfs' ? 'DFS' : 'BFS'
    sidebarTraversalStatusText = `Warning: fill or nullify all empty nodes before running ${algoName}.`
  }

  return (
    <div className="app">
      <Header />

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
                disabled={isTraversalRunning}
              >
                {isConnectMode ? 'Cancel connect' : 'Connect nodes'}
              </button>
              <div className="edge-direction-picker" aria-label="New edge direction">
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'forward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || isTraversalRunning}
                  aria-pressed={newEdgeDirection === 'forward'}
                  title="Create outbound edge (from selected node)"
                  onClick={() => handleNewEdgeDirectionChange('forward')}
                >
                  <DirectionIcon direction="forward" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'both' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || isTraversalRunning}
                  aria-pressed={newEdgeDirection === 'both'}
                  title="Create bidirectional edge"
                  onClick={() => handleNewEdgeDirectionChange('both')}
                >
                  <DirectionIcon direction="both" />
                </button>
                <button
                  className={`btn btn-pill edge-direction-option ${newEdgeDirection === 'backward' ? 'btn-active' : ''}`}
                  type="button"
                  disabled={!isConnectMode || isTraversalRunning}
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
                  disabled={isTraversalRunning}
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
                  disabled={isTraversalRunning}
                >
                  {isDeleteEdgeMode
                    ? selectedEdgeIds.length > 0
                      ? 'Delete selected edges'
                      : 'Cancel edge delete'
                    : 'Delete edges'}
                </button>
              </div>
              <button className="btn btn-clear" type="button" onClick={handleClearCanvas} disabled={isTraversalRunning}>
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
            <div className="canvas-zoom-controls" onClick={(event) => event.stopPropagation()}>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={handleZoomOut}
                disabled={canvasZoom <= CANVAS_ZOOM_MIN}
                aria-label="Zoom out"
              >
                -
              </button>
              <span className="canvas-zoom-value">{Math.round(canvasZoom * 100)}%</span>
              <button
                className="canvas-zoom-btn"
                type="button"
                onClick={handleZoomIn}
                disabled={canvasZoom >= CANVAS_ZOOM_MAX}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>

            <div
              className="canvas-content"
              style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'center center' }}
            >
              <EdgesLayer
                nodes={nodes}
                edges={edges}
                isDeleteEdgeMode={isDeleteEdgeMode}
                selectedEdgeIds={selectedEdgeIds}
                onToggleEdgeSelection={toggleEdgeSelection}
              />

              <EdgeToggles
                nodes={nodes}
                edges={edges}
                isDeleteEdgeMode={isDeleteEdgeMode}
                selectedEdgeIds={selectedEdgeIds}
                onToggleEdgeDirection={toggleEdgeDirection}
                onToggleEdgeSelection={toggleEdgeSelection}
              />

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
                traversalVisitedNodeIds={traversalVisitedNodeIds}
                traversalCurrentNodeId={traversalCurrentNodeId}
                traversalStartNodeId={traversalStartNodeId}
                traversalGoalNodeIds={traversalGoalNodeIds}
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
          </div>
        </section>

        <Sidebar
          algorithmTab={algorithmTab}
          onAlgorithmTabChange={handleAlgorithmTabChange}
          goalType={goalType}
          onGoalTypeChange={handleGoalTypeChange}
          startNodeLabel={startNodeLabel}
          onStartNodeLabelChange={handleStartNodeLabelChange}
          goalNodeLabel={goalNodeLabel}
          onGoalNodeLabelChange={handleGoalNodeLabelChange}
          goalValueInput={goalValueInput}
          onGoalValueInputChange={handleGoalValueInputChange}
          onRunTraversal={runTraversalFromSidebar}
          onStopTraversal={resetTraversalVisualization}
          canRunTraversal={canRunTraversal}
          traversalStatusText={sidebarTraversalStatusText}
          isTraversalRunning={isTraversalRunning}
          isTraversalPlaying={isTraversalPlaying}
          traversalPlaybackSpeed={traversalPlaybackSpeed}
          onTraversalPlaybackSpeedChange={handleTraversalPlaybackSpeedChange}
          onPlayTraversal={playTraversal}
          onPauseTraversal={pauseTraversal}
          onNextTraversalStep={stepTraversalForward}
          onPreviousTraversalStep={stepTraversalBackward}
          canStepForward={canStepForward}
          canStepBackward={canStepBackward}
          canTogglePlay={canTogglePlay}
          isTraversalPlaybackComplete={isTraversalPlaybackComplete}
          fillMin={fillMin}
          fillMax={fillMax}
          onFillMinChange={handleFillMinChange}
          onFillMaxChange={handleFillMaxChange}
          onFillRangeBlur={syncFillRange}
          onFillRangeKeyDown={handleFillRangeKeyDown}
          onFillEmptyValues={fillEmptyValues}
          canFillEmpty={canFillEmpty}
          onNullifyEmptyValues={nullifyEmptyValues}
          canNullifyEmpty={canNullifyEmpty}
          onEmptyAllValues={handleEmptyAllClick}
          canEmptyAll={canEmptyAll}
          onPresetClick={handlePresetClick}
        />
      </div>

      <ConfirmModal
        open={showClearConfirm}
        title="Clear canvas?"
        body="This will remove all nodes from the canvas."
        confirmLabel="Clear"
        onConfirm={confirmClearCanvas}
        onCancel={cancelClearCanvas}
      />

      {pendingPreset && (
        <ConfirmModal
          open={showPresetConfirm}
          title="Replace canvas with preset?"
          body={`This will clear the current canvas and load “${pendingPreset.name}”.`}
          confirmLabel="Replace"
          onConfirm={confirmPresetReplace}
          onCancel={cancelPresetReplace}
        />
      )}

      <ConfirmModal
        open={showEmptyAllConfirm}
        title="Empty all values?"
        body="This resets every node back to empty, wiping any numbers and nulls."
        confirmLabel="Empty all"
        onConfirm={confirmEmptyAll}
        onCancel={cancelEmptyAll}
      />

      <NodeContextMenu
        contextMenu={contextMenu}
        nodes={nodes}
        isDeleteMode={isDeleteMode}
        onClose={closeContextMenu}
        onEditValue={beginEditingNode}
        onDelete={deleteNode}
      />
    </div>
  )
}

export default App